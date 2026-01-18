import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAchievementTriggers } from './useAchievementTriggers';

type Currency = 'USD' | 'EUR' | 'TRY';

interface PurchaseParams {
  listingId: string;
  sellerId: string;
  price: number;
  listingCurrency: Currency;
  deliveryOption: 'vault' | 'trade' | 'ship';
  title: string;
  category: string;
  condition: string;
  imageUrl?: string | null;
  shippingAddress?: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    postalCode: string;
  };
  gemsUsed?: number; // Number of gems to apply as discount (1 gem = $0.01)
}

interface ExchangeRates {
  USD_TRY: number;
  USD_EUR: number;
  EUR_TRY: number;
}

const DEFAULT_RATES: ExchangeRates = {
  USD_TRY: 42.62,
  USD_EUR: 0.92,
  EUR_TRY: 46.32,
};

// Fetch current exchange rates from database
const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  try {
    const { data, error } = await supabase
      .from('currency_rates')
      .select('from_currency, to_currency, rate');

    if (!error && data) {
      const rates = { ...DEFAULT_RATES };
      data.forEach((row: { from_currency: string; to_currency: string; rate: number }) => {
        const key = `${row.from_currency}_${row.to_currency}` as keyof ExchangeRates;
        if (key in rates) {
          rates[key] = Number(row.rate);
        }
      });
      return rates;
    }
  } catch {
    // Fallback to default rates silently
  }
  return DEFAULT_RATES;
};

// Convert any currency to USD
const convertToUSD = (amount: number, fromCurrency: Currency, rates: ExchangeRates): number => {
  if (fromCurrency === 'USD') return amount;
  if (fromCurrency === 'TRY') return amount / rates.USD_TRY;
  if (fromCurrency === 'EUR') return amount / rates.USD_EUR;
  return amount;
};

// Convert USD to any currency
const convertFromUSD = (amountUSD: number, toCurrency: Currency, rates: ExchangeRates): number => {
  if (toCurrency === 'USD') return amountUSD;
  if (toCurrency === 'TRY') return amountUSD * rates.USD_TRY;
  if (toCurrency === 'EUR') return amountUSD * rates.USD_EUR;
  return amountUSD;
};

export const usePurchase = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { 
    checkPurchaseAchievements, 
    checkSaleAchievements, 
    checkCollectionAchievements,
    checkVaultAchievements,
    checkSpendingAchievements,
    checkEarningsAchievements 
  } = useAchievementTriggers();

  const checkIsPro = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('tier, expires_at')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!data || data.tier !== 'pro') return false;
    if (data.expires_at && new Date(data.expires_at) < new Date()) return false;
    return true;
  };

  const calculateFees = async (price: number, buyerId?: string, sellerId?: string) => {
    // Check Pro status for both buyer and seller
    const buyerIsPro = buyerId ? await checkIsPro(buyerId) : false;
    const sellerIsPro = sellerId ? await checkIsPro(sellerId) : false;

    const buyerFeeRate = buyerIsPro ? 0.025 : 0.05; // 2.5% for Pro, 5% standard
    const sellerFeeRate = sellerIsPro ? 0.045 : 0.08; // 4.5% for Pro, 8% standard

    return {
      buyerFee: price * buyerFeeRate,
      sellerFee: price * sellerFeeRate,
      totalBuyerPays: price + (price * buyerFeeRate),
      sellerReceives: price - (price * sellerFeeRate),
      buyerIsPro,
      sellerIsPro,
    };
  };

  // Quick sync version for UI display (assumes standard rates)
  const calculateFeesSync = (price: number, buyerIsPro = false, sellerIsPro = false) => {
    const buyerFeeRate = buyerIsPro ? 0.025 : 0.05;
    const sellerFeeRate = sellerIsPro ? 0.045 : 0.08;
    return {
      buyerFee: price * buyerFeeRate,
      sellerFee: price * sellerFeeRate,
      totalBuyerPays: price + (price * buyerFeeRate),
      sellerReceives: price - (price * sellerFeeRate),
    };
  };

  const purchase = async (params: PurchaseParams) => {
    setLoading(true);

    try {
      // 1. Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to make a purchase');
        navigate('/auth');
        return { success: false };
      }

      const buyerId = session.user.id;

      // Prevent buying own listing
      if (buyerId === params.sellerId) {
        toast.error('You cannot buy your own listing');
        return { success: false };
      }

      // Fetch current exchange rates
      const exchangeRates = await fetchExchangeRates();

      // 2. Get buyer's wallet
      const { data: buyerWallet, error: buyerWalletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', buyerId)
        .maybeSingle();

      if (buyerWalletError) throw buyerWalletError;
      if (!buyerWallet) {
        toast.error('Wallet not found. Please contact support.');
        return { success: false };
      }

      // 3. Get seller's wallet
      const { data: sellerWallet, error: sellerWalletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', params.sellerId)
        .maybeSingle();

      if (sellerWalletError) throw sellerWalletError;
      if (!sellerWallet) {
        toast.error('Seller wallet not found');
        return { success: false };
      }

      const buyerCurrency = (buyerWallet.currency || 'USD') as Currency;
      const sellerCurrency = (sellerWallet.currency || 'USD') as Currency;
      const listingCurrency = params.listingCurrency || 'USD';

      // CRITICAL: Convert listing price to USD first (our base currency for all calculations)
      const priceInUSD = convertToUSD(params.price, listingCurrency, exchangeRates);

      // 4. Calculate fees based on USD price
      const fees = await calculateFees(priceInUSD, buyerId, params.sellerId);

      // Calculate gem discount in USD (1 gem = $0.01)
      const gemsUsed = params.gemsUsed || 0;
      const gemDiscountUSD = gemsUsed / 100;
      const adjustedTotalBuyerPays = Math.max(0, fees.totalBuyerPays - gemDiscountUSD);

      // Convert buyer's total to their wallet currency for balance check
      const buyerTotalInWalletCurrency = convertFromUSD(adjustedTotalBuyerPays, buyerCurrency, exchangeRates);

      // 5. Check buyer has sufficient balance in their currency
      if (Number(buyerWallet.balance) < buyerTotalInWalletCurrency) {
        const currencySymbol = buyerCurrency === 'USD' ? '$' : buyerCurrency === 'EUR' ? '€' : '₺';
        toast.error(`Insufficient balance. You need ${currencySymbol}${buyerTotalInWalletCurrency.toFixed(2)} (including fees)`);
        navigate('/wallet');
        return { success: false };
      }

      // 5b. If using gems, verify gem balance and deduct gems first
      if (gemsUsed > 0) {
        const { data: gemResult, error: gemError } = await supabase.rpc('spend_cardboom_points', {
          p_user_id: buyerId,
          p_amount: gemsUsed,
          p_source: 'purchase',
          p_description: `Used for purchase: ${params.title}`,
          p_reference_id: params.listingId,
        });

        // The RPC returns a JSONB object with success field
        const gemResultParsed = gemResult as unknown as { success: boolean; error?: string } | null;
        if (gemError || (gemResultParsed && !gemResultParsed.success)) {
          toast.error(gemResultParsed?.error || 'Failed to apply gems discount. Please try again.');
          return { success: false };
        }
      }

      // 6. Check listing is still active
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('status')
        .eq('id', params.listingId)
        .single();

      if (listingError || listing?.status !== 'active') {
        toast.error('This listing is no longer available');
        return { success: false };
      }

      // Calculate seller payout in their wallet currency
      const sellerPayoutInWalletCurrency = convertFromUSD(fees.sellerReceives, sellerCurrency, exchangeRates);

      // Check if seller is verified for instant payout
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('is_verified_seller')
        .eq('id', params.sellerId)
        .single();

      const isVerifiedSeller = sellerProfile?.is_verified_seller || false;

      // 7. Create order with escrow tracking
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          listing_id: params.listingId,
          buyer_id: buyerId,
          seller_id: params.sellerId,
          price: priceInUSD,
          buyer_fee: fees.buyerFee,
          seller_fee: fees.sellerFee,
          delivery_option: params.deliveryOption,
          status: 'paid',
          escrow_status: isVerifiedSeller ? 'released' : 'pending', // Hold in escrow unless verified
          escrow_held_amount: buyerTotalInWalletCurrency,
          seller_is_verified: isVerifiedSeller,
          listing_currency: listingCurrency,
          buyer_currency: buyerCurrency,
          seller_currency: sellerCurrency,
          exchange_rate_used: exchangeRates.USD_TRY,
          price_in_listing_currency: params.price,
          seller_payout_in_seller_currency: sellerPayoutInWalletCurrency,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 8. Update listing status to sold
      const { error: updateListingError } = await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', params.listingId);

      if (updateListingError) throw updateListingError;

      // 9. Deduct from buyer's wallet (funds go to escrow)
      const newBuyerBalance = Number(buyerWallet.balance) - buyerTotalInWalletCurrency;
      const { error: buyerUpdateError } = await supabase
        .from('wallets')
        .update({ balance: newBuyerBalance })
        .eq('id', buyerWallet.id);

      if (buyerUpdateError) throw buyerUpdateError;

      // 10. Create buyer transaction record (funds held in escrow)
      await supabase
        .from('transactions')
        .insert({
          wallet_id: buyerWallet.id,
          type: 'purchase',
          amount: -buyerTotalInWalletCurrency,
          fee: convertFromUSD(fees.buyerFee, buyerCurrency, exchangeRates),
          description: `Purchase: ${params.title}${isVerifiedSeller ? '' : ' (funds in escrow)'}`,
          reference_id: order.id,
        });

      // 11. Log order creation action
      try {
        await supabase.rpc('log_order_action', {
          p_order_id: order.id,
          p_action_type: 'created',
          p_actor_id: buyerId,
          p_actor_type: 'user',
          p_details: { price: priceInUSD, is_verified_seller: isVerifiedSeller },
        });
      } catch {
        // Non-critical, continue
      }

      // 12. Handle seller payment based on verified status
      if (isVerifiedSeller) {
        // VERIFIED SELLER: Instant payout - credit immediately
        const newSellerBalance = Number(sellerWallet.balance) + sellerPayoutInWalletCurrency;
        const { error: sellerUpdateError } = await supabase
          .from('wallets')
          .update({ balance: newSellerBalance })
          .eq('id', sellerWallet.id);

        if (sellerUpdateError) throw sellerUpdateError;

        // Create seller transaction record
        await supabase
          .from('transactions')
          .insert({
            wallet_id: sellerWallet.id,
            type: 'sale',
            amount: sellerPayoutInWalletCurrency,
            fee: convertFromUSD(fees.sellerFee, sellerCurrency, exchangeRates),
            description: `Sale: ${params.title} (verified seller - instant payout)`,
            reference_id: order.id,
          });

        // Mark funds as released
        await supabase
          .from('orders')
          .update({ funds_released_at: new Date().toISOString(), payout_status: 'paid' })
          .eq('id', order.id);

        // Log funds released
        try {
          await supabase.rpc('log_order_action', {
            p_order_id: order.id,
            p_action_type: 'funds_released',
            p_actor_id: null,
            p_actor_type: 'system',
            p_details: { amount: sellerPayoutInWalletCurrency, reason: 'verified_seller_instant' },
          });
        } catch {
          // Non-critical
        }
      }
      // NON-VERIFIED SELLER: Funds held in escrow until both parties confirm

      // 13. Add item to buyer's portfolio
      await supabase
        .from('portfolio_items')
        .insert({
          user_id: buyerId,
          custom_name: params.title,
          purchase_price: priceInUSD, // Store in USD for consistency
          purchase_date: new Date().toISOString().split('T')[0],
          image_url: params.imageUrl,
          in_vault: params.deliveryOption === 'vault',
        });

      // 14. Remove from seller's portfolio (if exists)
      await supabase
        .from('portfolio_items')
        .delete()
        .eq('user_id', params.sellerId)
        .ilike('custom_name', params.title);

      // 15. If vault option, create vault item for buyer
      if (params.deliveryOption === 'vault') {
        await supabase
          .from('vault_items')
          .insert({
            owner_id: buyerId,
            title: params.title,
            category: params.category,
            condition: params.condition,
            estimated_value: priceInUSD,
            listing_id: params.listingId,
            order_id: order.id,
            image_url: params.imageUrl,
          });
      }

      // Check achievements for buyer and seller
      try {
        await checkPurchaseAchievements(buyerId);
        await checkCollectionAchievements(buyerId);
        await checkSpendingAchievements(buyerId);
        await checkSaleAchievements(params.sellerId);
        await checkEarningsAchievements(params.sellerId);
        if (params.deliveryOption === 'vault') {
          await checkVaultAchievements(buyerId);
        }
      } catch (achievementError) {
        console.error('Error checking achievements:', achievementError);
      }

      // Award XP for both buyer and seller (1 XP per $1)
      try {
        const xpAmount = Math.floor(priceInUSD);
        if (xpAmount > 0) {
          // Buyer XP
          await supabase.rpc('add_pass_xp', { p_user_id: buyerId, p_xp_amount: xpAmount, p_source: 'purchase' });
          // Seller XP
          await supabase.rpc('add_pass_xp', { p_user_id: params.sellerId, p_xp_amount: xpAmount, p_source: 'sale' });
        }
      } catch (xpError) {
        console.error('Error awarding XP:', xpError);
      }

      // 16. Send seller notification (in-app, email, SMS)
      try {
        // Fetch seller profile for notification
        const { data: sellerProfile } = await supabase
          .from('profiles')
          .select('email, phone, display_name, full_name')
          .eq('id', params.sellerId)
          .single();

        const sellerName = sellerProfile?.full_name || sellerProfile?.display_name || 'Seller';
        const currencySymbol = listingCurrency === 'USD' ? '$' : listingCurrency === 'EUR' ? '€' : '₺';

        // Determine notification content based on delivery option
        const isVaultDelivery = params.deliveryOption === 'vault';
        const notificationType = isVaultDelivery ? 'vault_shipping_required' : 'sale';
        const notificationTitle = isVaultDelivery 
          ? '📦 Ship to CardBoom Vault!' 
          : '🎉 Your item sold!';
        const notificationBody = isVaultDelivery
          ? `${params.title} sold for ${currencySymbol}${params.price.toFixed(2)}. Please ship to CardBoom Vault ASAP for buyer verification.`
          : `${params.title} sold for ${currencySymbol}${params.price.toFixed(2)}`;

        // In-app notification
        await supabase.functions.invoke('send-notification', {
          body: {
            user_id: params.sellerId,
            type: notificationType,
            title: notificationTitle,
            body: notificationBody,
            data: { listing_id: params.listingId, order_id: order.id, delivery_option: params.deliveryOption },
          },
        });

        // Email notification with vault-specific content
        if (sellerProfile?.email) {
          const emailTemplateKey = isVaultDelivery ? 'vault_shipping_required' : 'item_sold';
          await supabase.functions.invoke('send-email', {
            body: {
              to: sellerProfile.email,
              template_key: emailTemplateKey,
              user_id: params.sellerId,
              variables: {
                user_name: sellerName,
                item_name: params.title,
                item_title: params.title,
                price: `${currencySymbol}${params.price.toFixed(2)}`,
                sale_price: `${currencySymbol}${params.price.toFixed(2)}`,
                payout_amount: `${currencySymbol}${sellerPayoutInWalletCurrency.toFixed(2)}`,
                order_id: order.id,
                is_vault_delivery: isVaultDelivery,
                vault_address: isVaultDelivery ? 'CardBoom Verification Hub, Istanbul, Turkey' : null,
              },
            },
          });
        }

        // SMS notification with vault-specific content
        if (sellerProfile?.phone) {
          const smsType = isVaultDelivery ? 'vault_shipping_required' : 'item_sold';
          const smsMessage = isVaultDelivery
            ? `CardBoom: ${params.title.slice(0, 20)} sold! Ship to our Vault ASAP for verification. Check app for details.`
            : null;
          
          await supabase.functions.invoke('send-sms', {
            body: {
              phone: sellerProfile.phone,
              type: smsType,
              message: smsMessage,
              data: {
                item_title: params.title.slice(0, 30),
                sale_price: `${currencySymbol}${params.price.toFixed(2)}`,
              },
            },
          });
        }
      } catch (notifError) {
        console.error('Error sending seller notifications:', notifError);
        // Non-critical, don't fail the purchase
      }

      toast.success('Purchase successful!');
      
      // Navigate to success page with order details
      navigate(`/order-success/${order.id}`, {
        state: {
          orderId: order.id,
          title: params.title,
          price: priceInUSD,
          fees: fees,
          deliveryOption: params.deliveryOption,
          imageUrl: params.imageUrl,
        }
      });

      return { success: true, orderId: order.id };

    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Purchase failed. Please try again.');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return { purchase, loading, calculateFees, calculateFeesSync };
};
