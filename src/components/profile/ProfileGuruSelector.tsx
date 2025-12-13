import { useState } from 'react';
import { Award, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProfileGuruSelectorProps {
  currentExpertise: string[];
  customGuru: string;
  onUpdate: (expertise: string[], customGuru: string | null) => Promise<void>;
}

const EXPERTISE_OPTIONS = [
  { id: 'pokemon', icon: '⚡' },
  { id: 'onepiece', icon: '🏴‍☠️' },
  { id: 'yugioh', icon: '🃏' },
  { id: 'nba', icon: '🏀' },
  { id: 'football', icon: '⚽' },
  { id: 'gaming', icon: '🎮' },
  { id: 'figures', icon: '🎭' },
];

export const ProfileGuruSelector = ({
  currentExpertise,
  customGuru,
  onUpdate
}: ProfileGuruSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>(currentExpertise);
  const [customGuruText, setCustomGuruText] = useState(customGuru);
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();

  const handleToggleExpertise = (id: string) => {
    setSelectedExpertise(prev => 
      prev.includes(id) 
        ? prev.filter(e => e !== id)
        : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(selectedExpertise, customGuruText || null);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Award className="h-4 w-4" />
          {t.profile.guruExpertise}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.profile.guruExpertise}</DialogTitle>
          <DialogDescription>
            {t.profile.selectExpertise}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            {EXPERTISE_OPTIONS.map((option) => {
              const isSelected = selectedExpertise.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => handleToggleExpertise(option.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className="text-sm font-medium">
                    {t.profile.expertiseCategories[option.id as keyof typeof t.profile.expertiseCategories]}
                  </span>
                  {isSelected && <Check className="h-4 w-4 text-primary ml-auto" />}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customGuru">{t.profile.customGuru}</Label>
            <Input
              id="customGuru"
              value={customGuruText}
              onChange={(e) => setCustomGuruText(e.target.value)}
              placeholder="e.g. Lorcana Expert, Vintage Sports Cards..."
              maxLength={50}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};