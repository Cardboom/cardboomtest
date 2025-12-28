import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trophy, Vote, Swords, CheckCircle } from 'lucide-react';
import { useCommunityVotesAdmin } from '@/hooks/useCommunityVotes';
import { format } from 'date-fns';

export const CommunityVotesManager = () => {
  const { allPolls, loading, createPoll, finalizePoll } = useCommunityVotesAdmin();
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    cardAName: '',
    cardBName: '',
    cardAImage: '',
    cardBImage: '',
    xpReward: 20,
  });

  const handleCreate = async () => {
    if (!formData.cardAName || !formData.cardBName) return;
    
    const success = await createPoll(
      formData.cardAName,
      formData.cardBName,
      formData.cardAImage || undefined,
      formData.cardBImage || undefined,
      undefined,
      undefined,
      formData.xpReward
    );
    
    if (success) {
      setCreateOpen(false);
      setFormData({ cardAName: '', cardBName: '', cardAImage: '', cardBImage: '', xpReward: 20 });
    }
  };

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const activePolls = allPolls.filter(p => p.status === 'active');
  const completedPolls = allPolls.filter(p => p.status === 'completed');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Vote className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle>Community Card Votes</CardTitle>
              <CardDescription>Daily polls for XP rewards (free feature)</CardDescription>
            </div>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Daily Poll
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Daily Card Poll</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Card A Name *</Label>
                    <Input
                      value={formData.cardAName}
                      onChange={(e) => setFormData({ ...formData, cardAName: e.target.value })}
                      placeholder="Charizard"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Card B Name *</Label>
                    <Input
                      value={formData.cardBName}
                      onChange={(e) => setFormData({ ...formData, cardBName: e.target.value })}
                      placeholder="Blastoise"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Card A Image URL</Label>
                    <Input
                      value={formData.cardAImage}
                      onChange={(e) => setFormData({ ...formData, cardAImage: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Card B Image URL</Label>
                    <Input
                      value={formData.cardBImage}
                      onChange={(e) => setFormData({ ...formData, cardBImage: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>XP Reward</Label>
                  <Input
                    type="number"
                    value={formData.xpReward}
                    onChange={(e) => setFormData({ ...formData, xpReward: Number(e.target.value) })}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  <Swords className="w-4 h-4 mr-2" />
                  Create Poll
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active Polls */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Swords className="w-4 h-4" />
            Active Polls ({activePolls.length})
          </h3>
          {activePolls.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active polls. Create one for today!</p>
          ) : (
            <div className="space-y-3">
              {activePolls.map((poll) => (
                <div key={poll.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-500/20 text-green-500">
                        Active
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(poll.vote_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <Badge variant="outline">+{poll.xp_reward} XP</Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1 text-center">
                      <p className="font-medium">{poll.card_a_name}</p>
                      <p className="text-sm text-muted-foreground">{poll.card_a_votes} votes</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-xs font-bold">
                      VS
                    </div>
                    <div className="flex-1 text-center">
                      <p className="font-medium">{poll.card_b_name}</p>
                      <p className="text-sm text-muted-foreground">{poll.card_b_votes} votes</p>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => finalizePoll(poll.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finalize & Announce Winner
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Polls */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Past Polls ({completedPolls.length})
          </h3>
          <div className="space-y-2">
            {completedPolls.slice(0, 10).map((poll) => (
              <div key={poll.id} className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm">
                    {poll.card_a_name} vs {poll.card_b_name}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {format(new Date(poll.vote_date), 'MMM d')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">
                    {poll.winner === 'card_a' ? poll.card_a_name : poll.card_b_name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
