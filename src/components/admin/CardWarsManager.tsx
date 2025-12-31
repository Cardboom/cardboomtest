import React, { useState, useEffect } from 'react';
import { Swords, Plus, Trophy, Clock, Check, Search, Gem, Image } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCardWarsAdmin } from '@/hooks/useCardWars';
import { formatDistanceToNow, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MarketItem {
  id: string;
  name: string;
  image_url: string | null;
  category: string;
}

export const CardWarsManager = () => {
  const { allWars, loading, createWar, endWar, refetch } = useCardWarsAdmin();
  const [createOpen, setCreateOpen] = useState(false);
  const [cardASearch, setCardASearch] = useState('');
  const [cardBSearch, setCardBSearch] = useState('');
  const [cardAResults, setCardAResults] = useState<MarketItem[]>([]);
  const [cardBResults, setCardBResults] = useState<MarketItem[]>([]);
  const [searchingA, setSearchingA] = useState(false);
  const [searchingB, setSearchingB] = useState(false);
  const [formData, setFormData] = useState({
    cardAId: '',
    cardAName: '',
    cardAImage: '',
    cardBId: '',
    cardBName: '',
    cardBImage: '',
    prizePool: '100',
    durationHours: '24',
  });

  // Search market items for Card A
  useEffect(() => {
    if (cardASearch.length < 2) {
      setCardAResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingA(true);
      const { data } = await supabase
        .from('market_items')
        .select('id, name, image_url, category')
        .ilike('name', `%${cardASearch}%`)
        .limit(10);
      
      setCardAResults(data || []);
      setSearchingA(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [cardASearch]);

  // Search market items for Card B
  useEffect(() => {
    if (cardBSearch.length < 2) {
      setCardBResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingB(true);
      const { data } = await supabase
        .from('market_items')
        .select('id, name, image_url, category')
        .ilike('name', `%${cardBSearch}%`)
        .limit(10);
      
      setCardBResults(data || []);
      setSearchingB(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [cardBSearch]);

  const selectCardA = (item: MarketItem) => {
    setFormData({
      ...formData,
      cardAId: item.id,
      cardAName: item.name,
      cardAImage: item.image_url || '',
    });
    setCardASearch('');
    setCardAResults([]);
  };

  const selectCardB = (item: MarketItem) => {
    setFormData({
      ...formData,
      cardBId: item.id,
      cardBName: item.name,
      cardBImage: item.image_url || '',
    });
    setCardBSearch('');
    setCardBResults([]);
  };

  const handleCreate = async () => {
    if (!formData.cardAName || !formData.cardBName) return;

    const success = await createWar(
      formData.cardAName,
      formData.cardBName,
      formData.cardAImage || undefined,
      formData.cardBImage || undefined,
      formData.cardAId || undefined,
      formData.cardBId || undefined,
      parseFloat(formData.prizePool),
      parseInt(formData.durationHours)
    );

    if (success) {
      setCreateOpen(false);
      setFormData({
        cardAId: '',
        cardAName: '',
        cardAImage: '',
        cardBId: '',
        cardBName: '',
        cardBImage: '',
        prizePool: '100',
        durationHours: '24',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5" />
            Card Wars Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeWars = allWars.filter(w => w.status === 'active');
  const completedWars = allWars.filter(w => w.status === 'completed');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-orange-500" />
            Card Wars Manager
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Winners earn prize pool share + <Gem className="w-3 h-3 inline text-primary" /> Cardboom Points
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Battle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Card War</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Card A Selection */}
              <div className="space-y-3 p-4 border rounded-lg bg-red-500/5 border-red-500/20">
                <Label className="text-red-500 font-semibold">Card A (Red Team)</Label>
                
                {formData.cardAName ? (
                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                    {formData.cardAImage && (
                      <img src={formData.cardAImage} alt={formData.cardAName} className="w-16 h-20 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{formData.cardAName}</p>
                      <p className="text-xs text-muted-foreground">ID: {formData.cardAId || 'Manual entry'}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setFormData({ ...formData, cardAId: '', cardAName: '', cardAImage: '' })}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search cards from marketplace..."
                        className="pl-9"
                        value={cardASearch}
                        onChange={(e) => setCardASearch(e.target.value)}
                      />
                    </div>
                    
                    {searchingA && <p className="text-sm text-muted-foreground">Searching...</p>}
                    
                    {cardAResults.length > 0 && (
                      <ScrollArea className="h-48 border rounded-lg">
                        <div className="p-2 space-y-1">
                          {cardAResults.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => selectCardA(item)}
                              className="w-full flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors text-left"
                            >
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-10 h-12 object-cover rounded" />
                              ) : (
                                <div className="w-10 h-12 bg-muted rounded flex items-center justify-center">
                                  <Image className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.category}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                    
                    <div className="text-center text-xs text-muted-foreground">or enter manually:</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Card name"
                        value={formData.cardAName}
                        onChange={(e) => setFormData({ ...formData, cardAName: e.target.value })}
                      />
                      <Input
                        placeholder="Image URL"
                        value={formData.cardAImage}
                        onChange={(e) => setFormData({ ...formData, cardAImage: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Card B Selection */}
              <div className="space-y-3 p-4 border rounded-lg bg-emerald-500/5 border-emerald-500/20">
                <Label className="text-emerald-500 font-semibold">Card B (Green Team)</Label>
                
                {formData.cardBName ? (
                  <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                    {formData.cardBImage && (
                      <img src={formData.cardBImage} alt={formData.cardBName} className="w-16 h-20 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{formData.cardBName}</p>
                      <p className="text-xs text-muted-foreground">ID: {formData.cardBId || 'Manual entry'}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setFormData({ ...formData, cardBId: '', cardBName: '', cardBImage: '' })}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search cards from marketplace..."
                        className="pl-9"
                        value={cardBSearch}
                        onChange={(e) => setCardBSearch(e.target.value)}
                      />
                    </div>
                    
                    {searchingB && <p className="text-sm text-muted-foreground">Searching...</p>}
                    
                    {cardBResults.length > 0 && (
                      <ScrollArea className="h-48 border rounded-lg">
                        <div className="p-2 space-y-1">
                          {cardBResults.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => selectCardB(item)}
                              className="w-full flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors text-left"
                            >
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-10 h-12 object-cover rounded" />
                              ) : (
                                <div className="w-10 h-12 bg-muted rounded flex items-center justify-center">
                                  <Image className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.category}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                    
                    <div className="text-center text-xs text-muted-foreground">or enter manually:</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Card name"
                        value={formData.cardBName}
                        onChange={(e) => setFormData({ ...formData, cardBName: e.target.value })}
                      />
                      <Input
                        placeholder="Image URL"
                        value={formData.cardBImage}
                        onChange={(e) => setFormData({ ...formData, cardBImage: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Battle Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prize Pool ($)</Label>
                  <Input
                    type="number"
                    value={formData.prizePool}
                    onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Winners also earn <Gem className="w-3 h-3 text-primary" /> points
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select 
                    value={formData.durationHours} 
                    onValueChange={(v) => setFormData({ ...formData, durationHours: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="48">48 hours</SelectItem>
                      <SelectItem value="72">72 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleCreate} 
                className="w-full"
                disabled={!formData.cardAName || !formData.cardBName}
              >
                <Swords className="w-4 h-4 mr-2" />
                Launch Battle
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {/* Active Wars */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Active Battles ({activeWars.length})
          </h3>
          {activeWars.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active battles</p>
          ) : (
            <div className="space-y-3">
              {activeWars.map((war) => (
                <div key={war.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {war.card_a_image && (
                        <img src={war.card_a_image} alt="" className="w-10 h-12 object-cover rounded" />
                      )}
                      <span className="font-bold">{war.card_a_name}</span>
                      <Badge variant="outline">VS</Badge>
                      <span className="font-bold">{war.card_b_name}</span>
                      {war.card_b_image && (
                        <img src={war.card_b_image} alt="" className="w-10 h-12 object-cover rounded" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        <Trophy className="w-3 h-3 mr-1" />
                        ${war.prize_pool}
                      </Badge>
                      <Badge>
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDistanceToNow(new Date(war.ends_at))}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Created {format(new Date(war.created_at), 'MMM d, h:mm a')}
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-red-500 border-red-500/50"
                        onClick={() => endWar(war.id, 'card_a')}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        {war.card_a_name} Wins
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-emerald-500 border-emerald-500/50"
                        onClick={() => endWar(war.id, 'card_b')}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        {war.card_b_name} Wins
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Wars */}
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Completed Battles ({completedWars.length})
          </h3>
          {completedWars.length === 0 ? (
            <p className="text-muted-foreground text-sm">No completed battles yet</p>
          ) : (
            <div className="space-y-2">
              {completedWars.slice(0, 10).map((war) => (
                <div key={war.id} className="p-3 rounded-lg border bg-muted/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={war.winner === 'card_a' ? 'font-bold text-green-500' : 'text-muted-foreground'}>
                      {war.card_a_name}
                    </span>
                    <span className="text-muted-foreground">vs</span>
                    <span className={war.winner === 'card_b' ? 'font-bold text-green-500' : 'text-muted-foreground'}>
                      {war.card_b_name}
                    </span>
                  </div>
                  <Badge variant="outline" className="border-green-500/50 text-green-500">
                    <Trophy className="w-3 h-3 mr-1" />
                    {war.winner === 'card_a' ? war.card_a_name : war.card_b_name} Won
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
