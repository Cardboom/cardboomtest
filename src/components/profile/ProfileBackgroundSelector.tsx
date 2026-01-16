import { useState } from 'react';
import { Check, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Background {
  id: string;
  name: string;
  type: string;
  css_value: string;
  unlock_level: number;
  xp_cost: number;
  is_premium: boolean;
}

interface ProfileBackgroundSelectorProps {
  backgrounds: Background[];
  unlockedBackgrounds: string[];
  currentBackground: string;
  userLevel: number;
  userXP: number;
  onSelect: (backgroundId: string) => void;
  onUnlock: (backgroundId: string, xpCost: number) => Promise<boolean>;
}

export const ProfileBackgroundSelector = ({
  backgrounds,
  unlockedBackgrounds,
  currentBackground,
  userLevel,
  userXP,
  onSelect,
  onUnlock
}: ProfileBackgroundSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const isUnlocked = (bg: Background) => {
    // Free backgrounds (xp_cost = 0) unlock automatically when user reaches the level
    if (bg.xp_cost === 0 && userLevel >= bg.unlock_level) return true;
    // Paid backgrounds must be explicitly unlocked
    return unlockedBackgrounds.includes(bg.id);
  };

  const canUnlock = (bg: Background) => {
    // Must meet level requirement AND have enough XP to purchase
    return userLevel >= bg.unlock_level && userXP >= bg.xp_cost;
  };

  const meetsLevelRequirement = (bg: Background) => {
    return userLevel >= bg.unlock_level;
  };

  const handleUnlock = async (bg: Background) => {
    setUnlocking(bg.id);
    await onUnlock(bg.id, bg.xp_cost);
    setUnlocking(null);
  };

  const getBackgroundStyle = (bg: Background): React.CSSProperties => {
    if (bg.type === 'animated') {
      // Assign different animation styles based on background name
      const name = bg.name.toLowerCase();
      let animationStyle = 'gradient-shift 8s ease infinite';
      let size = '400% 400%';
      
      if (name.includes('matrix') || name.includes('rain')) {
        animationStyle = 'matrix-rain 3s linear infinite';
        size = '100% 200%';
      } else if (name.includes('plasma') || name.includes('storm')) {
        animationStyle = 'plasma-flow 12s linear infinite';
        size = '200% 200%';
      } else if (name.includes('pulse') || name.includes('lightning')) {
        animationStyle = 'gradient-shift 4s ease infinite, pulse-glow 2s ease-in-out infinite';
        size = '400% 400%';
      } else if (name.includes('gold') || name.includes('legendary') || name.includes('solar')) {
        animationStyle = 'shimmer-gold 3s linear infinite, gradient-shift 6s ease infinite';
        size = '200% 100%';
      } else if (name.includes('holographic') || name.includes('quantum')) {
        animationStyle = 'gradient-shift 3s ease infinite';
        size = '600% 600%';
      }
      
      return {
        background: bg.css_value,
        backgroundSize: size,
        animation: animationStyle
      };
    }
    return { background: bg.css_value };
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Change Background
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose Profile Background</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {backgrounds.map((bg) => {
            const unlocked = isUnlocked(bg);
            const selected = currentBackground === bg.id;
            const canPurchase = canUnlock(bg);

            return (
              <div
                key={bg.id}
                className={cn(
                  "relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer group",
                  selected ? "border-primary ring-2 ring-primary/50" : "border-border hover:border-muted-foreground",
                  !unlocked && "opacity-75"
                )}
                onClick={() => unlocked && onSelect(bg.id)}
              >
                <div
                  className="aspect-video"
                  style={getBackgroundStyle(bg)}
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{bg.name}</p>
                      {bg.is_premium && (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Premium
                        </span>
                      )}
                    </div>
                    
                    {selected && (
                      <div className="bg-primary rounded-full p-1">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    
                    {!unlocked && (
                      <div className="flex items-center gap-1 text-muted">
                        <Lock className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>

                {!unlocked && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!meetsLevelRequirement(bg) ? (
                      <>
                        <Lock className="h-5 w-5 text-muted-foreground" />
                        <p className="text-white text-sm font-medium">Level {bg.unlock_level} Required</p>
                        <p className="text-muted-foreground text-xs">You are level {userLevel}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-amber-400 text-sm font-medium">{bg.xp_cost} XP</p>
                        <p className="text-muted-foreground text-xs">You have {userXP} XP</p>
                        {canPurchase && (
                          <Button
                            size="sm"
                            className="mt-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnlock(bg);
                            }}
                            disabled={unlocking === bg.id}
                          >
                            {unlocking === bg.id ? 'Unlocking...' : 'Unlock Now'}
                          </Button>
                        )}
                        {!canPurchase && (
                          <p className="text-red-400 text-xs">Need {bg.xp_cost - userXP} more XP</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
