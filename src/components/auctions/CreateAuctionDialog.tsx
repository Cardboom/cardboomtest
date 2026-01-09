import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Gavel, 
  Plus, 
  Loader2, 
  Crown, 
  ShieldCheck, 
  Lock,
  Calendar,
  DollarSign,
  ImageIcon,
  AlertCircle
} from 'lucide-react';
import { useAuctionEligibility } from '@/hooks/useAuctionEligibility';
import { useAuctions } from '@/hooks/useAuctions';
import { cn } from '@/lib/utils';

interface CreateAuctionDialogProps {
  trigger?: React.ReactNode;
  vaultItemId?: string;
  cardInstanceId?: string;
  prefillData?: {
    title?: string;
    category?: string;
    condition?: string;
    image_url?: string;
  };
}

const CATEGORIES = [
  { value: 'pokemon', label: 'Pokémon' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!' },
  { value: 'onepiece', label: 'One Piece' },
  { value: 'lorcana', label: 'Lorcana' },
  { value: 'mtg', label: 'Magic: The Gathering' },
  { value: 'sports', label: 'Sports Cards' },
  { value: 'figures', label: 'Figures & Collectibles' },
];

const CONDITIONS = [
  { value: 'gem_mint', label: 'Gem Mint' },
  { value: 'near_mint', label: 'Near Mint' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'played', label: 'Played' },
];

const DURATION_OPTIONS = [
  { value: '1', label: '1 Day' },
  { value: '3', label: '3 Days' },
  { value: '5', label: '5 Days' },
  { value: '7', label: '7 Days' },
  { value: '10', label: '10 Days' },
  { value: '14', label: '14 Days (Max)' },
];

export const CreateAuctionDialog = ({ 
  trigger, 
  vaultItemId,
  cardInstanceId,
  prefillData 
}: CreateAuctionDialogProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string>();
  const [loading, setLoading] = useState(false);
  
  const { canCreate, isVerifiedSeller, isEnterprise, loading: eligibilityLoading, reason } = useAuctionEligibility(userId);
  const { createAuction } = useAuctions();

  // Form state
  const [title, setTitle] = useState(prefillData?.title || '');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(prefillData?.category || '');
  const [condition, setCondition] = useState(prefillData?.condition || 'near_mint');
  const [imageUrl, setImageUrl] = useState(prefillData?.image_url || '');
  const [startingPrice, setStartingPrice] = useState('');
  const [reservePrice, setReservePrice] = useState('');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [bidIncrement, setBidIncrement] = useState('1');
  const [durationDays, setDurationDays] = useState('7');

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (prefillData) {
      setTitle(prefillData.title || '');
      setCategory(prefillData.category || '');
      setCondition(prefillData.condition || 'near_mint');
      setImageUrl(prefillData.image_url || '');
    }
  }, [prefillData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast.error('Please sign in to create an auction');
      navigate('/auth');
      return;
    }

    if (!canCreate) {
      toast.error('You must be a Verified Seller or Enterprise subscriber to create auctions');
      return;
    }

    if (!title || !category || !startingPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    const startPrice = parseFloat(startingPrice);
    if (isNaN(startPrice) || startPrice <= 0) {
      toast.error('Please enter a valid starting price');
      return;
    }

    setLoading(true);

    try {
      const durationHours = parseInt(durationDays) * 24;
      
      await createAuction.mutateAsync({
        title,
        description: description || undefined,
        category,
        condition,
        image_url: imageUrl || undefined,
        starting_price: startPrice,
        reserve_price: reservePrice ? parseFloat(reservePrice) : undefined,
        buy_now_price: buyNowPrice ? parseFloat(buyNowPrice) : undefined,
        bid_increment: parseFloat(bidIncrement) || 1,
        duration_hours: durationHours,
      });

      setOpen(false);
      resetForm();
      toast.success('Auction created successfully!');
    } catch (error: any) {
      console.error('Error creating auction:', error);
      toast.error(error.message || 'Failed to create auction');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setCondition('near_mint');
    setImageUrl('');
    setStartingPrice('');
    setReservePrice('');
    setBuyNowPrice('');
    setBidIncrement('1');
    setDurationDays('7');
  };

  const renderEligibilityBadge = () => {
    if (eligibilityLoading) return null;
    
    if (isVerifiedSeller) {
      return (
        <Badge className="gap-1 bg-primary/20 text-primary border-primary/30">
          <ShieldCheck className="w-3 h-3" />
          Verified Seller
        </Badge>
      );
    }
    
    if (isEnterprise) {
      return (
        <Badge className="gap-1 bg-gold/20 text-gold border-gold/30">
          <Crown className="w-3 h-3" />
          Enterprise
        </Badge>
      );
    }
    
    return null;
  };

  // Show upgrade prompt for ineligible users
  const renderIneligibleContent = () => (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Auctions Require Upgrade</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Create live auctions by becoming a Verified Seller or upgrading to Enterprise.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="glass rounded-lg p-4 border border-primary/20">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Verified Seller</p>
              <p className="text-sm text-muted-foreground">
                Complete KYC verification and pay $30/month to access auctions with vault-verified items.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  setOpen(false);
                  navigate('/verified-seller');
                }}
              >
                Become Verified
              </Button>
            </div>
          </div>
        </div>

        <div className="glass rounded-lg p-4 border border-gold/20">
          <div className="flex items-start gap-3">
            <Crown className="w-5 h-5 text-gold mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Enterprise Subscription</p>
              <p className="text-sm text-muted-foreground">
                Upgrade to Enterprise ($49.99/mo) for auction access, lower fees, and premium features.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 border-gold/30 text-gold hover:bg-gold/10"
                onClick={() => {
                  setOpen(false);
                  navigate('/pricing');
                }}
              >
                Upgrade to Enterprise
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Auction creation form
  const renderAuctionForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        {renderEligibilityBadge()}
        <span className="text-xs text-muted-foreground">
          Max duration: 14 days
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., PSA 10 Charizard VMAX Rainbow"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Category *</Label>
          <Select value={category} onValueChange={setCategory} required>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Condition</Label>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((cond) => (
                <SelectItem key={cond.value} value={cond.value}>
                  {cond.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your item, condition, provenance..."
            rows={3}
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="imageUrl">Image URL</Label>
          <div className="flex gap-2">
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1"
            />
            {imageUrl && (
              <div className="w-10 h-10 rounded border overflow-hidden">
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startingPrice">Starting Price ($) *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="startingPrice"
              type="number"
              min="0.01"
              step="0.01"
              value={startingPrice}
              onChange={(e) => setStartingPrice(e.target.value)}
              placeholder="0.00"
              className="pl-8"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bidIncrement">Bid Increment ($)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="bidIncrement"
              type="number"
              min="0.01"
              step="0.01"
              value={bidIncrement}
              onChange={(e) => setBidIncrement(e.target.value)}
              placeholder="1.00"
              className="pl-8"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reservePrice">Reserve Price (Optional)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="reservePrice"
              type="number"
              min="0"
              step="0.01"
              value={reservePrice}
              onChange={(e) => setReservePrice(e.target.value)}
              placeholder="Min price to sell"
              className="pl-8"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Won't sell below this price
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="buyNowPrice">Buy Now Price (Optional)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="buyNowPrice"
              type="number"
              min="0"
              step="0.01"
              value={buyNowPrice}
              onChange={(e) => setBuyNowPrice(e.target.value)}
              placeholder="Instant purchase price"
              className="pl-8"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Duration</Label>
          <Select value={durationDays} onValueChange={setDurationDays}>
            <SelectTrigger>
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {vaultItemId && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary">Vault-verified item</span>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 gap-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Gavel className="w-4 h-4" />
              Create Auction
            </>
          )}
        </Button>
      </div>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Auction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-primary" />
            {canCreate ? 'Create Auction' : 'Auction Access Required'}
          </DialogTitle>
        </DialogHeader>
        
        {eligibilityLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : canCreate ? (
          renderAuctionForm()
        ) : (
          renderIneligibleContent()
        )}
      </DialogContent>
    </Dialog>
  );
};
