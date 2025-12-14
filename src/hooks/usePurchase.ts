import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PurchaseParams {
  listingId: string;
  sellerId: string;
  price: number;
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

export const usePurchase = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const calculateFees = (price: number) => {
    const buyerFeeRate = 0.05; // 5% buyer fee
    const sellerFeeRate = 0.08; // 8% seller fee
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

      // 3. Calculate fees
      const fees = calculateFees(params.price);

      // 4. Check buyer has sufficient balance
      if (Number(buyerWallet.balance) < fees.totalBuyerPays) {
        toast.error(`Insufficient balance. You need $${fees.totalBuyerPays.toFixed(2)} (including fees)`);
        navigate('/wallet');
        return { success: false };
      }

      // 5. Get seller's wallet
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

      // 7. Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          listing_id: params.listingId,
          buyer_id: buyerId,
          seller_id: params.sellerId,
          price: params.price,
          buyer_fee: fees.buyerFee,
          seller_fee: fees.sellerFee,
          delivery_option: params.deliveryOption,
          status: 'paid',
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

      // 9. Deduct from buyer's wallet
      const newBuyerBalance = Number(buyerWallet.balance) - fees.totalBuyerPays;
      const { error: buyerUpdateError } = await supabase
        .from('wallets')
        .update({ balance: newBuyerBalance })
        .eq('id', buyerWallet.id);

      if (buyerUpdateError) throw buyerUpdateError;

      // 10. Create buyer transaction record
      await supabase
        .from('transactions')
        .insert({
          wallet_id: buyerWallet.id,
          type: 'purchase',
          amount: -fees.totalBuyerPays,
          fee: fees.buyerFee,
          description: `Purchase: ${params.title}`,
          reference_id: order.id,
        });

      // 11. Credit seller's wallet
      const newSellerBalance = Number(sellerWallet.balance) + fees.sellerReceives;
      const { error: sellerUpdateError } = await supabase
        .from('wallets')
        .update({ balance: newSellerBalance })
        .eq('id', sellerWallet.id);

      if (sellerUpdateError) throw sellerUpdateError;

      // 12. Create seller transaction record
      await supabase
        .from('transactions')
        .insert({
          wallet_id: sellerWallet.id,
          type: 'sale',
          amount: fees.sellerReceives,
          fee: fees.sellerFee,
          description: `Sale: ${params.title}`,
          reference_id: order.id,
        });

      // 13. Add item to buyer's portfolio
      await supabase
        .from('portfolio_items')
        .insert({
          user_id: buyerId,
          custom_name: params.title,
          purchase_price: params.price,
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
            estimated_value: params.price,
            listing_id: params.listingId,
            order_id: order.id,
            image_url: params.imageUrl,
          });
      }

      toast.success('Purchase successful!');
      
      // Navigate to success page with order details
      navigate(`/order-success/${order.id}`, {
        state: {
          orderId: order.id,
          title: params.title,
          price: params.price,
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

  return { purchase, loading, calculateFees };
};
