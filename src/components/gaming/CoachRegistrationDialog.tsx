import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Trophy, Gamepad2, DollarSign, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CoachRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Game = 'valorant' | 'csgo' | 'pubg' | 'lol';

interface CoachingService {
  game: Game;
  enabled: boolean;
  hourlyRate: string;
  description: string;
}

const GAMES: { id: Game; name: string; icon: string }[] = [
  { id: 'valorant', name: 'Valorant', icon: '🎯' },
  { id: 'csgo', name: 'CS:GO / CS2', icon: '🔫' },
  { id: 'pubg', name: 'PUBG', icon: '🪖' },
  { id: 'lol', name: 'League of Legends', icon: '⚔️' },
];

export const CoachRegistrationDialog = ({ open, onOpenChange }: CoachRegistrationDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [rank, setRank] = useState('');
  const [experience, setExperience] = useState('');
  const [services, setServices] = useState<CoachingService[]>(
    GAMES.map(g => ({ game: g.id, enabled: false, hourlyRate: '', description: '' }))
  );

  const updateService = (game: Game, field: keyof CoachingService, value: string | boolean) => {
    setServices(prev => 
      prev.map(s => s.game === game ? { ...s, [field]: value } : s)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const enabledServices = services.filter(s => s.enabled);
    if (enabledServices.length === 0) {
      toast.error('Please select at least one game to coach');
      return;
    }

    const invalidServices = enabledServices.filter(s => !s.hourlyRate || parseFloat(s.hourlyRate) <= 0);
    if (invalidServices.length > 0) {
      toast.error('Please set valid hourly rates for all selected games');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please log in to register as a coach');
        onOpenChange(false);
        return;
      }

      // Update profile with coach info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName || undefined,
          bio: bio || undefined,
          custom_guru: 'gaming_coach',
          guru_expertise: enabledServices.map(s => s.game),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Create coaching listings for each enabled game
      for (const service of enabledServices) {
        const gameName = GAMES.find(g => g.id === service.game)?.name || service.game;
        
        await supabase.from('listings').insert({
          seller_id: user.id,
          title: `${gameName} Coaching - 1 Hour Session`,
          description: service.description || `Professional ${gameName} coaching by ${displayName || 'Pro Coach'}. Rank: ${rank}. ${experience} experience.`,
          price: parseFloat(service.hourlyRate),
          category: 'coaching',
          condition: 'Mint',
          image_url: null,
          allows_shipping: false,
          allows_trade: false,
          allows_vault: false,
        });
      }

      toast.success('Successfully registered as a coach! Your services are now live.');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Coach registration error:', error);
      toast.error(error.message || 'Failed to register as coach');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="w-6 h-6 text-gold" />
            Register as Gaming Coach
          </DialogTitle>
          <DialogDescription>
            Set up your coaching profile and pricing for different games
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              Coach Profile
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Coach Name</Label>
                <Input
                  id="displayName"
                  placeholder="Your gaming alias"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rank">Highest Rank Achieved</Label>
                <Input
                  id="rank"
                  placeholder="e.g., Radiant, Global Elite"
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Years of Experience</Label>
              <Select value={experience} onValueChange={setExperience}>
                <SelectTrigger>
                  <SelectValue placeholder="Select experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2">1-2 years</SelectItem>
                  <SelectItem value="3-5">3-5 years</SelectItem>
                  <SelectItem value="5+">5+ years</SelectItem>
                  <SelectItem value="pro">Professional Player</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">About You</Label>
              <Textarea
                id="bio"
                placeholder="Tell potential students about your coaching style, achievements, and what they'll learn..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Game Selection & Pricing */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Games & Pricing
            </h3>
            <p className="text-sm text-muted-foreground">
              Select the games you want to coach and set your hourly rate for each
            </p>

            <div className="space-y-4">
              {GAMES.map((game) => {
                const service = services.find(s => s.game === game.id)!;
                return (
                  <div key={game.id} className="p-4 rounded-xl border border-border bg-card/50">
                    <div className="flex items-center gap-3 mb-3">
                      <Checkbox
                        id={`game-${game.id}`}
                        checked={service.enabled}
                        onCheckedChange={(checked) => updateService(game.id, 'enabled', !!checked)}
                      />
                      <label 
                        htmlFor={`game-${game.id}`} 
                        className="font-medium text-foreground cursor-pointer flex items-center gap-2"
                      >
                        <span>{game.icon}</span>
                        {game.name}
                      </label>
                    </div>

                    {service.enabled && (
                      <div className="grid grid-cols-2 gap-4 mt-3 pl-6">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1 text-xs">
                            <Clock className="w-3 h-3" />
                            Hourly Rate (TL)
                          </Label>
                          <Input
                            type="number"
                            placeholder="e.g., 150"
                            value={service.hourlyRate}
                            onChange={(e) => updateService(game.id, 'hourlyRate', e.target.value)}
                            min="1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Session Description (optional)</Label>
                          <Input
                            placeholder="What you'll teach"
                            value={service.description}
                            onChange={(e) => updateService(game.id, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80"
            >
              {loading ? 'Registering...' : 'Register as Coach'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};