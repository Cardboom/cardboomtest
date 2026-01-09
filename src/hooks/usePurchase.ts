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

      // Convert buyer's total to their wallet currency for balance check
      const buyerTotalInWalletCurrency = convertFromUSD(fees.totalBuyerPays, buyerCurrency, exchangeRates);

      // 5. Check buyer has sufficient balance in their currency
      if (Number(buyerWallet.balance) < buyerTotalInWalletCurrency) {
        const currencySymbol = buyerCurrency === 'USD' ? '$' : buyerCurrency === 'EUR' ? '€' : '₺';
        toast.error(`Insufficient balance. You need ${currencySymbol}${buyerTotalInWalletCurrency.toFixed(2)} (including fees)`);
        navigate('/wallet');
        return { success: false };
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

      // 7. Create order with currency tracking
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          listing_id: params.listingId,
          buyer_id: buyerId,
          seller_id: params.sellerId,
          price: priceInUSD, // Store in USD
          buyer_fee: fees.buyerFee,
          seller_fee: fees.sellerFee,
          delivery_option: params.deliveryOption,
          status: 'paid',
          listing_currency: listingCurrency,
          buyer_currency: buyerCurrency,
          seller_currency: sellerCurrency,
          exchange_rate_used: exchangeRates.USD_TRY, // Store for audit
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

      // 9. Deduct from buyer's wallet (in their currency)
      const newBuyerBalance = Number(buyerWallet.balance) - buyerTotalInWalletCurrency;
      const { error: buyerUpdateError } = await supabase
        .from('wallets')
        .update({ balance: newBuyerBalance })
        .eq('id', buyerWallet.id);

      if (buyerUpdateError) throw buyerUpdateError;

      // 10. Create buyer transaction record (in their currency)
      await supabase
        .from('transactions')
        .insert({
          wallet_id: buyerWallet.id,
          type: 'purchase',
          amount: -buyerTotalInWalletCurrency,
          fee: convertFromUSD(fees.buyerFee, buyerCurrency, exchangeRates),
          description: `Purchase: ${params.title}`,
          reference_id: order.id,
        });

      // 11. Credit seller's wallet (in their currency)
      const newSellerBalance = Number(sellerWallet.balance) + sellerPayoutInWalletCurrency;
      const { error: sellerUpdateError } = await supabase
        .from('wallets')
        .update({ balance: newSellerBalance })
        .eq('id', sellerWallet.id);

      if (sellerUpdateError) throw sellerUpdateError;

      // 12. Create seller transaction record (in their currency)
      await supabase
        .from('transactions')
        .insert({
          wallet_id: sellerWallet.id,
          type: 'sale',
          amount: sellerPayoutInWalletCurrency,
          fee: convertFromUSD(fees.sellerFee, sellerCurrency, exchangeRates),
          description: `Sale: ${params.title}`,
          reference_id: order.id,
        });

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
