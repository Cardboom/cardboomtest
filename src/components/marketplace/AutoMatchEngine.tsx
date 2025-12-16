import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Zap, Search, ShoppingCart, MessageCircle, Bot, 
  TrendingUp, Clock, CheckCircle, Settings, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface MatchedListing {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  condition: string;
  seller: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    trust_score: number;
  };
  matchScore: number;
  autoAcceptEnabled: boolean;
}

interface AutoMatchSettings {
  minPrice: number;
  maxPrice: number;
  autoAcceptPercentage: number;
  autoCounterEnabled: boolean;
  counterPercentage: number;
}

export const AutoMatchEngine = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [matches, setMatches] = useState<MatchedListing[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [settings, setSettings] = useState<AutoMatchSettings>({
    minPrice: 0,
    maxPrice: 10000,
    autoAcceptPercentage: 95,
    autoCounterEnabled: true,
    counterPercentage: 90
  });
  const [showSettings, setShowSettings] = useState(false);

  const searchForMatches = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // Search listings that match the query
      const { data: listings, error } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          price,
          image_url,
          condition,
          seller_id
        `)
        .ilike('title', `%${searchQuery}%`)
        .eq('status', 'active')
        .gte('price', settings.minPrice)
        .lte('price', settings.maxPrice)
        .limit(20);

      if (error) throw error;

      // Get seller profiles
      const sellerIds = [...new Set(listings?.map(l => l.seller_id) || [])];
      const { data: sellers } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', sellerIds);

      // Get seller ratings
      const sellerMap = new Map(sellers?.map(s => [s.id, s]));
      
      const matchedListings: MatchedListing[] = (listings || []).map(listing => {
        const seller = sellerMap.get(listing.seller_id);
        return {
          ...listing,
          seller: {
            id: listing.seller_id,
            display_name: seller?.display_name || 'Seller',
            avatar_url: seller?.avatar_url,
            trust_score: Math.floor(Math.random() * 20) + 80 // Mock trust score
          },
          matchScore: Math.floor(Math.random() * 30) + 70,
          autoAcceptEnabled: Math.random() > 0.5
        };
      }).sort((a, b) => b.matchScore - a.matchScore);

      setMatches(matchedListings);
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Failed to search for matches');
    } finally {
      setIsSearching(false);
    }
  };

  const handleBuyNow = (listing: MatchedListing) => {
    navigate(`/listing/${listing.id}`);
  };

  const handleMakeOffer = async (listing: MatchedListing, offerAmount: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please login to make an offer');
      navigate('/auth');
      return;
    }

    try {
      const { error } = await supabase.from('offers').insert({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.seller.id,
        amount: offerAmount,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

      if (error) throw error;
      toast.success('Offer sent successfully!');
    } catch (error) {
      console.error('Error making offer:', error);
      toast.error('Failed to send offer');
    }
  };

  const handleAutoNegotiate = async (listing: MatchedListing) => {
    // Auto-negotiate starts at 85% of listing price
    const initialOffer = listing.price * 0.85;
    toast.info(`Starting auto-negotiation at $${initialOffer.toFixed(2)}`);
    
    // Simulate negotiation
    setTimeout(() => {
      if (listing.autoAcceptEnabled) {
        toast.success('Offer accepted! Proceeding to checkout...');
        navigate(`/listing/${listing.id}?autoAccepted=true`);
      } else {
        toast.info('Counter-offer received. Check your offers.');
      }
    }, 2000);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Auto-Match Engine
            <Badge variant="secondary" className="ml-2">Beta</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for cards, figures, or collectibles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchForMatches()}
                className="pl-10"
              />
            </div>
            <Button onClick={searchForMatches} disabled={isSearching}>
              {isSearching ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Zap className="h-4 w-4" />
                </motion.div>
              ) : (
                'Find Matches'
              )}
            </Button>
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Auto-Match Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label>Price Range</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        value={settings.minPrice}
                        onChange={(e) => setSettings(s => ({ ...s, minPrice: Number(e.target.value) }))}
                        className="w-24"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="number"
                        value={settings.maxPrice}
                        onChange={(e) => setSettings(s => ({ ...s, maxPrice: Number(e.target.value) }))}
                        className="w-24"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Auto-Accept Threshold: {settings.autoAcceptPercentage}%</Label>
                    <Slider
                      value={[settings.autoAcceptPercentage]}
                      onValueChange={([v]) => setSettings(s => ({ ...s, autoAcceptPercentage: v }))}
                      min={80}
                      max={100}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Automatically accept offers at or above this % of your listing price
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Counter Offers</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically counter low offers
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoCounterEnabled}
                      onCheckedChange={(v) => setSettings(s => ({ ...s, autoCounterEnabled: v }))}
                    />
                  </div>

                  {settings.autoCounterEnabled && (
                    <div className="space-y-2">
                      <Label>Counter at: {settings.counterPercentage}%</Label>
                      <Slider
                        value={[settings.counterPercentage]}
                        onValueChange={([v]) => setSettings(s => ({ ...s, counterPercentage: v }))}
                        min={85}
                        max={99}
                        step={1}
                      />
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bot className="h-4 w-4" />
            <span>AI-powered matching finds the best deals 24/7</span>
          </div>
        </CardContent>
      </Card>

      {/* Matches Grid */}
      <AnimatePresence mode="popLayout">
        {matches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {matches.map((match, index) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <div className="aspect-square bg-secondary/30 p-4">
                      <img
                        src={match.image_url || '/placeholder.svg'}
                        alt={match.title}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    {/* Match Score Badge */}
                    <div className="absolute top-2 right-2">
                      <Badge 
                        className={match.matchScore > 90 
                          ? 'bg-gain text-gain-foreground' 
                          : 'bg-primary text-primary-foreground'
                        }
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {match.matchScore}% match
                      </Badge>
                    </div>

                    {match.autoAcceptEnabled && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="gap-1">
                          <Zap className="h-3 w-3" />
                          Instant Buy
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-4">
                    <div>
                      <h3 className="font-semibold line-clamp-2">{match.title}</h3>
                      <p className="text-sm text-muted-foreground">{match.condition}</p>
                    </div>

                    {/* Seller Info */}
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={match.seller.avatar_url || undefined} />
                        <AvatarFallback>
                          {match.seller.display_name?.charAt(0) || 'S'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {match.seller.display_name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3 text-gain" />
                          {match.seller.trust_score}% trust
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{formatPrice(match.price)}</span>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        24h response
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="col-span-1"
                        onClick={() => handleBuyNow(match)}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="col-span-1"
                        onClick={() => handleMakeOffer(match, match.price * 0.9)}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="col-span-1 gap-1"
                        onClick={() => handleAutoNegotiate(match)}
                      >
                        <Bot className="h-4 w-4" />
                        Auto
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!isSearching && matches.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No matches found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or price range settings
          </p>
        </div>
      )}
    </div>
  );
};
