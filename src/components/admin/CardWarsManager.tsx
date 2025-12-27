import React, { useState } from 'react';
import { Swords, Plus, Trophy, Clock, Users, Check, X } from 'lucide-react';
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

export const CardWarsManager = () => {
  const { allWars, loading, createWar, endWar, refetch } = useCardWarsAdmin();
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    cardAName: '',
    cardBName: '',
    cardAImage: '',
    cardBImage: '',
    prizePool: '100',
    durationHours: '24',
  });

  const handleCreate = async () => {
    if (!formData.cardAName || !formData.cardBName) return;

    const success = await createWar(
      formData.cardAName,
      formData.cardBName,
      formData.cardAImage || undefined,
      formData.cardBImage || undefined,
      undefined,
      undefined,
      parseFloat(formData.prizePool),
      parseInt(formData.durationHours)
    );

    if (success) {
      setCreateOpen(false);
      setFormData({
        cardAName: '',
        cardBName: '',
        cardAImage: '',
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
        <CardTitle className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-orange-500" />
          Card Wars Manager
        </CardTitle>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Battle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Card War</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Card A Name</Label>
                  <Input
                    placeholder="e.g., Charizard"
                    value={formData.cardAName}
                    onChange={(e) => setFormData({ ...formData, cardAName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Card B Name</Label>
                  <Input
                    placeholder="e.g., Blastoise"
                    value={formData.cardBName}
                    onChange={(e) => setFormData({ ...formData, cardBName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Card A Image URL</Label>
                  <Input
                    placeholder="https://..."
                    value={formData.cardAImage}
                    onChange={(e) => setFormData({ ...formData, cardAImage: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Card B Image URL</Label>
                  <Input
                    placeholder="https://..."
                    value={formData.cardBImage}
                    onChange={(e) => setFormData({ ...formData, cardBImage: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prize Pool ($)</Label>
                  <Input
                    type="number"
                    value={formData.prizePool}
                    onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (hours)</Label>
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
              <Button onClick={handleCreate} className="w-full">
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
                      <span className="font-bold">{war.card_a_name}</span>
                      <Badge variant="outline">VS</Badge>
                      <span className="font-bold">{war.card_b_name}</span>
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
                        className="text-green-500 border-green-500/50"
                        onClick={() => endWar(war.id, 'card_a')}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        {war.card_a_name} Wins
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-blue-500 border-blue-500/50"
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
