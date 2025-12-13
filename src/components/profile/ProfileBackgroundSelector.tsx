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
    // Default and free backgrounds are always unlocked
    if (bg.xp_cost === 0 && userLevel >= bg.unlock_level) return true;
    return unlockedBackgrounds.includes(bg.id);
  };

  const canUnlock = (bg: Background) => {
    return userLevel >= bg.unlock_level && userXP >= bg.xp_cost;
  };

  const handleUnlock = async (bg: Background) => {
    setUnlocking(bg.id);
    await onUnlock(bg.id, bg.xp_cost);
    setUnlocking(null);
  };

  const getBackgroundStyle = (bg: Background) => {
    if (bg.type === 'animated') {
      return {
        background: bg.css_value,
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 8s ease infinite'
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
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm">Level {bg.unlock_level} Required</p>
                    <p className="text-amber-400 text-sm font-medium">{bg.xp_cost} XP</p>
                    {canPurchase && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlock(bg);
                        }}
                        disabled={unlocking === bg.id}
                      >
                        {unlocking === bg.id ? 'Unlocking...' : 'Unlock'}
                      </Button>
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
