import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Layers, Plus, Check, Sparkles, Search, ChevronRight, Trophy
} from 'lucide-react';
import { useSetCompletion } from '@/hooks/useSetCompletion';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export const SetCompletionTracker = () => {
  const [userId, setUserId] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  const [cardToAdd, setCardToAdd] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });
  }, []);

  const { 
    cardSets, 
    userProgress, 
    isLoading, 
    addCardToSet, 
    removeCardFromSet,
    getSetProgress 
  } = useSetCompletion(userId);

  const categories = ['all', ...new Set(cardSets?.map(s => s.category) || [])];

  const filteredSets = cardSets?.filter(set => {
    const matchesCategory = selectedCategory === 'all' || set.category === selectedCategory;
    const matchesSearch = set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          set.series?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const setsInProgress = userProgress?.filter(p => p.completion_percent > 0) || [];
  const completedSets = userProgress?.filter(p => p.completion_percent >= 100) || [];

  const handleAddCard = () => {
    if (selectedSet && cardToAdd.trim()) {
      addCardToSet.mutate({ setId: selectedSet, cardNumber: cardToAdd.trim() });
      setCardToAdd('');
    }
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          Set Completion Tracker
          {completedSets.length > 0 && (
            <Badge className="bg-gold text-gold-foreground gap-1">
              <Trophy className="w-3 h-3" />
              {completedSets.length} Complete
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Sets In Progress */}
        {setsInProgress.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">In Progress</h3>
            <div className="grid gap-3">
              {setsInProgress.map((progress) => {
                const set = progress.card_sets;
                if (!set) return null;
                const ownedCount = Array.isArray(progress.owned_cards) ? progress.owned_cards.length : 0;
                
                return (
                  <Dialog key={progress.id}>
                    <DialogTrigger asChild>
                      <button className="w-full text-left glass rounded-lg p-4 hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{set.name}</span>
                            <Badge variant="outline" className="text-xs">{set.category}</Badge>
                          </div>
                          <span className="text-sm font-semibold text-primary">
                            {ownedCount}/{set.total_cards}
                          </span>
                        </div>
                        <Progress 
                          value={progress.completion_percent} 
                          className="h-2"
                        />
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">{set.series}</span>
                          <span className="text-xs text-muted-foreground">
                            {progress.completion_percent.toFixed(1)}%
                          </span>
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{set.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{set.category}</Badge>
                          <Badge variant="secondary">{set.series}</Badge>
                        </div>
                        <Progress value={progress.completion_percent} className="h-3" />
                        <p className="text-center font-semibold">
                          {ownedCount} of {set.total_cards} cards ({progress.completion_percent.toFixed(1)}%)
                        </p>
                        
                        <div className="flex gap-2">
                          <Input
                            placeholder="Card # to add (e.g., 1, 25, 102)"
                            value={cardToAdd}
                            onChange={(e) => setCardToAdd(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setSelectedSet(set.id);
                                handleAddCard();
                              }
                            }}
                          />
                          <Button 
                            onClick={() => {
                              setSelectedSet(set.id);
                              handleAddCard();
                            }}
                            disabled={!cardToAdd.trim()}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        {Array.isArray(progress.owned_cards) && progress.owned_cards.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Cards Owned:</p>
                            <div className="flex flex-wrap gap-1">
                              {progress.owned_cards.sort((a, b) => parseInt(a) - parseInt(b)).map((card: string) => (
                                <Badge 
                                  key={card} 
                                  variant="secondary"
                                  className="cursor-pointer hover:bg-destructive/20"
                                  onClick={() => removeCardFromSet.mutate({ setId: set.id, cardNumber: card })}
                                >
                                  #{card} ×
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                );
              })}
            </div>
          </div>
        )}

        {/* Browse All Sets */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Browse Sets</h3>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search sets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {filteredSets?.map((set) => {
                const progress = getSetProgress(set.id);
                const ownedCount = progress && Array.isArray(progress.owned_cards) 
                  ? progress.owned_cards.length 
                  : 0;
                const percent = progress?.completion_percent || 0;
                const isComplete = percent >= 100;

                return (
                  <Dialog key={set.id}>
                    <DialogTrigger asChild>
                      <button className={cn(
                        "w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between",
                        isComplete 
                          ? "bg-gold/10 border border-gold/30 hover:bg-gold/20" 
                          : "hover:bg-secondary/50"
                      )}>
                        <div className="flex items-center gap-3">
                          {isComplete && <Sparkles className="w-4 h-4 text-gold" />}
                          <div>
                            <p className="font-medium text-foreground">{set.name}</p>
                            <p className="text-xs text-muted-foreground">{set.series} • {set.total_cards} cards</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {ownedCount > 0 && (
                            <span className="text-sm text-primary font-medium">
                              {ownedCount}/{set.total_cards}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          {isComplete && <Sparkles className="w-5 h-5 text-gold" />}
                          {set.name}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{set.category}</Badge>
                          <Badge variant="secondary">{set.series}</Badge>
                          <Badge variant="outline">{set.total_cards} cards</Badge>
                        </div>
                        
                        <Progress value={percent} className="h-3" />
                        <p className="text-center font-semibold">
                          {ownedCount} of {set.total_cards} cards ({percent.toFixed(1)}%)
                        </p>

                        <div className="flex gap-2">
                          <Input
                            placeholder="Card # to add"
                            value={cardToAdd}
                            onChange={(e) => setCardToAdd(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setSelectedSet(set.id);
                                setTimeout(handleAddCard, 0);
                              }
                            }}
                          />
                          <Button 
                            onClick={() => {
                              setSelectedSet(set.id);
                              addCardToSet.mutate({ setId: set.id, cardNumber: cardToAdd.trim() });
                              setCardToAdd('');
                            }}
                            disabled={!cardToAdd.trim()}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        {progress && Array.isArray(progress.owned_cards) && progress.owned_cards.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Cards Owned:</p>
                            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                              {progress.owned_cards.sort((a, b) => parseInt(a) - parseInt(b)).map((card: string) => (
                                <Badge 
                                  key={card} 
                                  variant="secondary"
                                  className="cursor-pointer hover:bg-destructive/20"
                                  onClick={() => removeCardFromSet.mutate({ setId: set.id, cardNumber: card })}
                                >
                                  #{card} ×
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
