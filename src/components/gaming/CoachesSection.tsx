import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Star, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GAME_INFO: Record<string, { name: string; icon: string; color: string }> = {
  valorant: { name: 'Valorant', icon: '🎯', color: 'bg-red-500/20 text-red-400' },
  csgo: { name: 'CS:GO', icon: '🔫', color: 'bg-orange-500/20 text-orange-400' },
  pubg: { name: 'PUBG', icon: '🪖', color: 'bg-yellow-500/20 text-yellow-400' },
  lol: { name: 'LoL', icon: '⚔️', color: 'bg-blue-500/20 text-blue-400' },
};

interface Coach {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  guru_expertise: string[] | null;
  level: number | null;
  xp: number | null;
}

export const CoachesSection = () => {
  const navigate = useNavigate();

  const { data: coaches, isLoading } = useQuery({
    queryKey: ['gaming-coaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio, guru_expertise, level, xp')
        .eq('custom_guru', 'gaming_coach')
        .limit(8);

      if (error) throw error;
      return data as Coach[];
    },
  });

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-gold" />
          Our Pro Coaches
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!coaches || coaches.length === 0) {
    return (
      <div className="mb-8 p-8 rounded-2xl bg-card/50 border border-border text-center">
        <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Coaches Yet</h3>
        <p className="text-muted-foreground mb-4">
          Be the first to register as a gaming coach and start earning!
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-gold" />
          Our Pro Coaches
        </h2>
        <Badge variant="secondary" className="bg-primary/20 text-primary">
          {coaches.length} Active Coaches
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {coaches.map((coach) => (
          <Card 
            key={coach.id} 
            className="bg-card/50 border-border hover:border-primary/50 transition-all hover:shadow-lg group"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-12 h-12 border-2 border-primary/30">
                  <AvatarImage src={coach.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {(coach.display_name || 'C')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {coach.display_name || 'Pro Coach'}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 text-gold fill-gold" />
                    <span>Level {coach.level || 1}</span>
                  </div>
                </div>
              </div>

              {/* Games */}
              <div className="flex flex-wrap gap-1 mb-3">
                {(coach.guru_expertise || []).slice(0, 3).map((game) => {
                  const info = GAME_INFO[game] || { name: game, icon: '🎮', color: 'bg-muted text-muted-foreground' };
                  return (
                    <Badge 
                      key={game} 
                      variant="secondary" 
                      className={`text-xs ${info.color}`}
                    >
                      {info.icon} {info.name}
                    </Badge>
                  );
                })}
                {(coach.guru_expertise?.length || 0) > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{(coach.guru_expertise?.length || 0) - 3}
                  </Badge>
                )}
              </div>

              {/* Bio */}
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2rem]">
                {coach.bio || 'Professional gaming coach ready to help you improve!'}
              </p>

              {/* Action */}
              <Button 
                size="sm" 
                variant="outline"
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                onClick={() => navigate(`/profile/${coach.id}`)}
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                View Profile
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};