import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Auction {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  category: string;
  condition: string;
  image_url: string | null;
  starting_price: number;
  current_bid: number | null;
  reserve_price: number | null;
  buy_now_price: number | null;
  bid_increment: number;
  bid_count: number;
  highest_bidder_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  created_at: string;
}

interface AuctionBid {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount: number;
  max_bid: number | null;
  is_winning: boolean;
  created_at: string;
}

export const useAuctions = (category?: string) => {
  const queryClient = useQueryClient();

  // Fetch active auctions
  const { data: auctions, isLoading } = useQuery({
    queryKey: ['auctions', category],
    queryFn: async () => {
      let query = supabase
        .from('auctions')
        .select('*')
        .eq('status', 'active')
        .gt('ends_at', new Date().toISOString())
        .order('ends_at', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Auction[];
    },
  });

  // Place a bid
  const placeBid = useMutation({
    mutationFn: async ({ 
      auctionId, 
      amount, 
      maxBid 
    }: { 
      auctionId: string; 
      amount: number; 
      maxBid?: number;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in to bid');

      // Get auction details
      const { data: auction, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', auctionId)
        .single();

      if (auctionError) throw auctionError;
      if (!auction) throw new Error('Auction not found');

      if (auction.status !== 'active') {
        throw new Error('This auction has ended');
      }

      if (new Date(auction.ends_at) < new Date()) {
        throw new Error('This auction has ended');
      }

      if (auction.seller_id === session.user.id) {
        throw new Error('You cannot bid on your own auction');
      }

      const minBid = auction.current_bid 
        ? auction.current_bid + auction.bid_increment 
        : auction.starting_price;

      if (amount < minBid) {
        throw new Error(`Minimum bid is $${minBid.toLocaleString()}`);
      }

      // Place the bid
      const { error: bidError } = await supabase
        .from('auction_bids')
        .insert({
          auction_id: auctionId,
          bidder_id: session.user.id,
          amount,
          max_bid: maxBid,
          is_winning: true,
        });

      if (bidError) throw bidError;

      // Update previous winning bids
      await supabase
        .from('auction_bids')
        .update({ is_winning: false })
        .eq('auction_id', auctionId)
        .neq('bidder_id', session.user.id);

      // Update auction current bid
      await supabase
        .from('auctions')
        .update({ 
          current_bid: amount,
          highest_bidder_id: session.user.id,
          bid_count: auction.bid_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', auctionId);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast.success('Bid placed successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Create auction
  const createAuction = useMutation({
    mutationFn: async (auctionData: {
      title: string;
      description?: string;
      category: string;
      condition: string;
      image_url?: string;
      starting_price: number;
      reserve_price?: number;
      buy_now_price?: number;
      bid_increment?: number;
      duration_hours: number;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in to create an auction');

      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + auctionData.duration_hours);

      const { data, error } = await supabase
        .from('auctions')
        .insert({
          seller_id: session.user.id,
          title: auctionData.title,
          description: auctionData.description,
          category: auctionData.category,
          condition: auctionData.condition,
          image_url: auctionData.image_url,
          starting_price: auctionData.starting_price,
          reserve_price: auctionData.reserve_price,
          buy_now_price: auctionData.buy_now_price,
          bid_increment: auctionData.bid_increment || 1,
          ends_at: endsAt.toISOString(),
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast.success('Auction created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Buy Now
  const buyNow = useMutation({
    mutationFn: async (auctionId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in');

      const { data: auction } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', auctionId)
        .single();

      if (!auction?.buy_now_price) throw new Error('Buy Now not available');

      await supabase
        .from('auctions')
        .update({
          status: 'sold',
          winner_id: session.user.id,
          final_price: auction.buy_now_price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', auctionId);

      return { success: true, price: auction.buy_now_price };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast.success('Purchase successful!');
    },
  });

  return {
    auctions,
    isLoading,
    placeBid,
    createAuction,
    buyNow,
  };
};

// Hook for single auction
export const useAuction = (auctionId: string) => {
  const { data: auction, isLoading } = useQuery({
    queryKey: ['auction', auctionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', auctionId)
        .single();

      if (error) throw error;
      return data as Auction;
    },
    enabled: !!auctionId,
    refetchInterval: 10000, // Refresh every 10 seconds for live updates
  });

  const { data: bids } = useQuery({
    queryKey: ['auction-bids', auctionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auction_bids')
        .select('*')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as AuctionBid[];
    },
    enabled: !!auctionId,
    refetchInterval: 5000,
  });

  return {
    auction,
    bids,
    isLoading,
  };
};
