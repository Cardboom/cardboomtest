import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Subscription {
  id: string;
  user_id: string;
  tier: string;
  price_monthly: number;
  started_at: string;
  expires_at: string;
  auto_renew: boolean;
  billing_cycle?: string;
}

// Monthly prices
const LITE_PRICE = 9.99;
const PRO_PRICE = 25;
const ENTERPRISE_PRICE = 50;

// Yearly prices (11 months)
const LITE_YEARLY_PRICE = LITE_PRICE * 11;
const PRO_YEARLY_PRICE = PRO_PRICE * 11;
const ENTERPRISE_YEARLY_PRICE = ENTERPRISE_PRICE * 11;

function getPrice(tier: string, billingCycle: string = 'monthly'): number {
  const isYearly = billingCycle === 'yearly';
  
  switch (tier) {
    case 'lite':
      return isYearly ? LITE_YEARLY_PRICE : LITE_PRICE;
    case 'pro':
      return isYearly ? PRO_YEARLY_PRICE : PRO_PRICE;
    case 'enterprise':
      return isYearly ? ENTERPRISE_YEARLY_PRICE : ENTERPRISE_PRICE;
    default:
      return 0;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing subscription renewals...');

    // Find subscriptions that:
    // 1. Have auto_renew = true
    // 2. Are expired or expiring within 1 day
    // 3. Have a paid tier (lite, pro, enterprise)
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + 1);

    const { data: subscriptions, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('auto_renew', true)
      .in('tier', ['lite', 'pro', 'enterprise'])
      .lte('expires_at', expiryThreshold.toISOString());

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions to process`);

    const results = {
      processed: 0,
      renewed: 0,
      failed: 0,
      insufficient_funds: 0,
      errors: [] as string[],
    };

    for (const subscription of (subscriptions || []) as Subscription[]) {
      results.processed++;
      
      try {
        const billingCycle = subscription.billing_cycle || 'monthly';
        const price = getPrice(subscription.tier, billingCycle);
        
        if (price === 0) {
          console.log(`Skipping subscription ${subscription.id} - free tier`);
          continue;
        }

        // Get user's wallet
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', subscription.user_id)
          .single();

        if (walletError || !wallet) {
          console.error(`Wallet not found for user ${subscription.user_id}`);
          results.failed++;
          results.errors.push(`User ${subscription.user_id}: Wallet not found`);
          continue;
        }

        // Check sufficient balance
        if (Number(wallet.balance) < price) {
          console.log(`Insufficient funds for user ${subscription.user_id}: has ${wallet.balance}, needs ${price}`);
          results.insufficient_funds++;
          
          // Downgrade to free tier instead of failing silently
          await supabase
            .from('user_subscriptions')
            .update({
              tier: 'free',
              auto_renew: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscription.id);
          
          // Send notification about failed renewal
          await supabase
            .from('notifications')
            .insert({
              user_id: subscription.user_id,
              type: 'subscription_renewal_failed',
              title: 'Subscription Renewal Failed',
              message: `Your ${subscription.tier} subscription couldn't be renewed due to insufficient wallet balance. Please top up to continue.`,
              data: { tier: subscription.tier, required_amount: price },
            });
          
          continue;
        }

        // Deduct from wallet
        const newBalance = Number(wallet.balance) - price;
        const { error: deductError } = await supabase
          .from('wallets')
          .update({ 
            balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', wallet.id);

        if (deductError) {
          console.error(`Error deducting from wallet for user ${subscription.user_id}:`, deductError);
          results.failed++;
          results.errors.push(`User ${subscription.user_id}: Wallet deduction failed`);
          continue;
        }

        // Create transaction record
        const tierLabel = subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1);
        const cycleLabel = billingCycle === 'yearly' ? 'Annual' : 'Monthly';
        
        await supabase
          .from('transactions')
          .insert({
            wallet_id: wallet.id,
            type: 'withdrawal',
            amount: -price,
            description: `${tierLabel} Subscription Renewal - ${cycleLabel}`,
          });

        // Calculate new expiry date
        const currentExpiry = new Date(subscription.expires_at);
        const newExpiry = new Date(currentExpiry);
        
        if (billingCycle === 'yearly') {
          newExpiry.setFullYear(newExpiry.getFullYear() + 1);
        } else {
          newExpiry.setDate(newExpiry.getDate() + 30);
        }

        // Update subscription
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            expires_at: newExpiry.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.error(`Error updating subscription ${subscription.id}:`, updateError);
          results.failed++;
          results.errors.push(`Subscription ${subscription.id}: Update failed after payment`);
          continue;
        }

        // Send success notification
        await supabase
          .from('notifications')
          .insert({
            user_id: subscription.user_id,
            type: 'subscription_renewed',
            title: 'Subscription Renewed',
            message: `Your ${tierLabel} subscription has been renewed. Next billing: ${newExpiry.toLocaleDateString()}`,
            data: { tier: subscription.tier, new_expiry: newExpiry.toISOString() },
          });

        console.log(`Successfully renewed subscription ${subscription.id} for user ${subscription.user_id}`);
        results.renewed++;

      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing subscription ${subscription.id}:`, err);
        results.failed++;
        results.errors.push(`Subscription ${subscription.id}: ${errMsg}`);
      }
    }

    console.log('Subscription renewal processing complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in process-subscription-renewals:', error);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
