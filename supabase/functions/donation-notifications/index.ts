import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyDonationRequest {
  action: 'goal_reached' | 'refunded';
  target_type: 'card_instance' | 'listing';
  target_id: string;
  owner_id: string;
  card_title?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NotifyDonationRequest = await req.json();
    console.log('Donation notification:', payload);

    // Get all donors for this target
    const column = payload.target_type === 'card_instance' ? 'card_instance_id' : 'listing_id';
    const { data: donations } = await supabase
      .from('grading_donations')
      .select('donor_user_id, amount_cents')
      .eq(column, payload.target_id);

    if (!donations || donations.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No donors to notify' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get unique donor IDs
    const donorIds = [...new Set(donations.map(d => d.donor_user_id))];
    const cardTitle = payload.card_title || 'a card';

    if (payload.action === 'goal_reached') {
      // Notify the owner
      await supabase.functions.invoke('send-notification', {
        body: {
          user_id: payload.owner_id,
          type: 'grading_complete',
          title: '🎉 Grading Goal Reached!',
          body: `Your card "${cardTitle}" has received enough donations for free grading! Check your grading credits.`,
          data: { listing_id: payload.target_type === 'listing' ? payload.target_id : null }
        }
      });

      // Notify each donor
      for (const donorId of donorIds) {
        await supabase.functions.invoke('send-notification', {
          body: {
            user_id: donorId,
            type: 'grading_complete',
            title: '🎁 Donation Goal Reached!',
            body: `The card you donated to "${cardTitle}" has reached its grading goal! Thank you for contributing.`,
            data: { listing_id: payload.target_type === 'listing' ? payload.target_id : null }
          }
        });
      }
    } else if (payload.action === 'refunded') {
      // Notify each donor about refund
      for (const donorId of donorIds) {
        const donorTotal = donations
          .filter(d => d.donor_user_id === donorId)
          .reduce((sum, d) => sum + d.amount_cents, 0);

        await supabase.functions.invoke('send-notification', {
          body: {
            user_id: donorId,
            type: 'order_update',
            title: '💰 Donation Refunded',
            body: `Your donation of $${(donorTotal / 100).toFixed(2)} for "${cardTitle}" has been refunded to your wallet.`,
            data: {}
          }
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      notified_donors: donorIds.length,
      action: payload.action
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in donation-notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
