import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getCategoryLabel, getCategoryIcon } from '@/lib/categoryLabels';
import { CardAutocomplete } from './CardAutocomplete';
import { 
  Gavel, Plus, Clock, User, Target, TrendingUp, 
  MessageSquare, ChevronRight, Sparkles, Filter, ShoppingBag, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Bid {
  id: string;
  item_name: string;
  category: string;
  grade: string | null;
  bid_amount: number;
  max_bid: number | null;
  notes: string | null;
  status: string;
  user_id: string;
  market_item_id: string | null;
  created_at: string;
  expires_at: string | null;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  matchingListings?: MatchingListing[];
}

interface MatchingListing {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  seller_id: string;
  category: string;
  slug: string | null;
}

const CATEGORIES = [
  'pokemon', 'mtg', 'yugioh', 'onepiece', 'lorcana', 'digimon',
  'nba', 'football', 'tcg', 'figures'
];

const GRADES = [
  { value: 'any', label: 'Any Grade' },
  { value: 'raw', label: 'Raw' },
  { value: 'psa10', label: 'PSA 10' },
  { value: 'psa9', label: 'PSA 9' },
  { value: 'psa8', label: 'PSA 8' },
  { value: 'bgs10', label: 'BGS 10' },
  { value: 'bgs9_5', label: 'BGS 9.5' },
  { value: 'cgc10', label: 'CGC 10' },
];

export const WantedBoard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatPrice } = useCurrency();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [user, setUser] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    item_name: '',
    category: 'pokemon',
    grade: 'any',
    bid_amount: '',
    max_bid: '',
    notes: '',
    market_item_id: null as string | null,
  });

  // Check auth
  useState(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  });

  // Fetch active bids with profiles and matching listings
  const { data: bids, isLoading } = useQuery({
    queryKey: ['wanted-board', selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('bids')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles for each bid
      const userIds = [...new Set((data || []).map(b => b.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Fetch matching listings for each bid
      const bidsWithMatches = await Promise.all(
        (data || []).map(async (bid) => {
          // Search for active listings that match the bid's item name
          const searchTerms = bid.item_name.toLowerCase().split(' ').filter((t: string) => t.length > 2);
          const firstTerm = searchTerms[0] || bid.item_name;
          
          const { data: listings } = await supabase
            .from('listings')
            .select('id, title, price, image_url, seller_id, category, slug')
            .eq('status', 'active')
            .eq('category', bid.category)
            .neq('seller_id', bid.user_id) // Don't show user's own listings
            .ilike('title', `%${firstTerm}%`)
            .lte('price', bid.max_bid || bid.bid_amount * 1.5) // Within budget
            .order('price', { ascending: true })
            .limit(3);

          return {
            ...bid,
            profile: profileMap.get(bid.user_id),
            matchingListings: listings || []
          };
        })
      );

      return bidsWithMatches as Bid[];
    },
    refetchInterval: 30000,
  });

  // Create bid mutation
  const createBid = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase.from('bids').insert({
        user_id: user.id,
        item_name: formData.item_name,
        category: formData.category,
        grade: formData.grade === 'any' ? null : formData.grade,
        bid_amount: parseFloat(formData.bid_amount),
        max_bid: formData.max_bid ? parseFloat(formData.max_bid) : null,
        notes: formData.notes || null,
        market_item_id: formData.market_item_id,
        status: 'active'
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wanted-board'] });
      toast.success('Want posted! Sellers will see your request.');
      setIsDialogOpen(false);
      setFormData({
        item_name: '',
        category: 'pokemon',
        grade: 'any',
        bid_amount: '',
        max_bid: '',
        notes: '',
        market_item_id: null,
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to post want');
    }
  });

  const handleSubmit = () => {
    if (!formData.item_name.trim()) {
      toast.error('Please enter an item name');
      return;
    }
    
    const bidAmount = parseFloat(formData.bid_amount);
    if (isNaN(bidAmount) || bidAmount <= 0) {
      toast.error('Please enter a valid offer price greater than $0');
      return;
    }
    
    const maxBid = formData.max_bid ? parseFloat(formData.max_bid) : null;
    if (maxBid !== null && (isNaN(maxBid) || maxBid < bidAmount)) {
      toast.error('Max bid must be greater than or equal to offer price');
      return;
    }
    
    createBid.mutate();
  };

  const getGradeLabel = (grade: string | null) => {
    if (!grade || grade === 'any') return 'Any';
    return GRADES.find(g => g.value === grade)?.label || grade.toUpperCase();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Card className="glass border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20">
              <Gavel className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-display">Wanted Board</CardTitle>
              <p className="text-sm text-muted-foreground">Post what you're looking for</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                className="gap-2"
                onClick={() => {
                  if (!user) {
                    navigate('/auth');
                    return;
                  }
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Post Want
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Post What You Want
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>What are you looking for?</Label>
                  <CardAutocomplete
                    value={formData.item_name}
                    onChange={(value) => setFormData({ ...formData, item_name: value, market_item_id: null })}
                    onSelectCard={(card) => {
                      setFormData({
                        ...formData,
                        item_name: card.name,
                        category: card.category,
                        market_item_id: card.id,
                        // Pre-fill a suggested bid based on market price
                        bid_amount: formData.bid_amount || Math.floor(card.current_price * 0.9).toString(),
                      });
                    }}
                    category={formData.category}
                    placeholder="e.g., Charizard Base Set Holo"
                  />
                  {formData.market_item_id && (
                    <p className="text-xs text-gain flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Matched to card in database
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {getCategoryIcon(cat)} {getCategoryLabel(cat)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Grade</Label>
                    <Select 
                      value={formData.grade} 
                      onValueChange={(v) => setFormData({ ...formData, grade: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADES.map(grade => (
                          <SelectItem key={grade.value} value={grade.value}>
                            {grade.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Your Offer ($)</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={formData.bid_amount}
                      onChange={(e) => setFormData({ ...formData, bid_amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Budget ($)</Label>
                    <Input
                      type="number"
                      placeholder="150"
                      value={formData.max_bid}
                      onChange={(e) => setFormData({ ...formData, max_bid: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Any specific requirements? Centering, condition notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createBid.isPending}>
                  {createBid.isPending ? 'Posting...' : 'Post Want'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className="shrink-0"
          >
            All
          </Button>
          {CATEGORIES.slice(0, 6).map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="shrink-0 gap-1"
            >
              {getCategoryIcon(cat)}
              <span className="hidden sm:inline">{getCategoryLabel(cat)}</span>
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading wants...
          </div>
        ) : bids && bids.length > 0 ? (
          <>
            {bids.slice(0, 8).map((bid) => (
              <div 
                key={bid.id}
                className={cn(
                  "p-4 rounded-xl bg-secondary/30 border border-border/50 hover:border-primary/30 transition-all cursor-pointer group",
                  isExpired(bid.expires_at) && "opacity-50"
                )}
                onClick={() => navigate(`/messages?contact=${bid.user_id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {getCategoryIcon(bid.category)} {getCategoryLabel(bid.category)}
                      </Badge>
                      {bid.grade && bid.grade !== 'any' && (
                        <Badge variant="outline" className="text-xs">
                          {getGradeLabel(bid.grade)}
                        </Badge>
                      )}
                      {isExpired(bid.expires_at) && (
                        <Badge variant="destructive" className="text-xs">Expired</Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      Looking for: {bid.item_name}
                    </h4>
                    {bid.notes && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {bid.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {bid.profile?.display_name || 'Anonymous'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-gain font-bold text-lg">
                      <TrendingUp className="w-4 h-4" />
                      {formatPrice(bid.bid_amount)}
                    </div>
                    {bid.max_bid && (
                      <p className="text-xs text-muted-foreground">
                        Max: {formatPrice(bid.max_bid)}
                      </p>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="mt-2 gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Contact
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                {/* Matching Listings Section */}
                {bid.matchingListings && bid.matchingListings.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingBag className="w-3 h-3 text-primary" />
                      <span className="text-xs font-medium text-primary">
                        {bid.matchingListings.length} matching listing{bid.matchingListings.length > 1 ? 's' : ''} available
                      </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {bid.matchingListings.map((listing) => (
                        <button
                          key={listing.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/listing/${listing.category}/${listing.slug || listing.id}`);
                          }}
                          className="flex items-center gap-2 p-2 bg-background rounded-lg border border-border/50 hover:border-primary/50 transition-colors shrink-0"
                        >
                          {listing.image_url && (
                            <img 
                              src={listing.image_url} 
                              alt={listing.title}
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          <div className="text-left">
                            <div className="text-xs font-medium line-clamp-1 max-w-[120px]">
                              {listing.title}
                            </div>
                            <div className="text-xs text-gain font-bold">
                              {formatPrice(listing.price)}
                            </div>
                          </div>
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {bids.length > 8 && (
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => navigate('/markets?tab=wanted')}
              >
                View All {bids.length} Wants
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">No active wants yet</p>
            <Button onClick={() => user ? setIsDialogOpen(true) : navigate('/auth')}>
              <Plus className="w-4 h-4 mr-2" />
              Be the First to Post
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
