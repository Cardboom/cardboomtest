import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, Camera, Sparkles, ChevronRight, ChevronLeft, 
  GamepadIcon, Swords, Crown, Loader2, CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingWizardProps {
  userId: string;
  email: string;
  initialDisplayName?: string;
  onComplete: () => void;
}

const GAME_OPTIONS = [
  { id: 'pokemon', label: 'Pokémon', icon: '🎴' },
  { id: 'mtg', label: 'Magic: The Gathering', icon: '🧙' },
  { id: 'yugioh', label: 'Yu-Gi-Oh!', icon: '⚔️' },
  { id: 'one-piece', label: 'One Piece', icon: '🏴‍☠️' },
  { id: 'disney-lorcana', label: 'Disney Lorcana', icon: '✨' },
  { id: 'sports', label: 'Sports Cards', icon: '⚽' },
  { id: 'anime', label: 'Anime Cards', icon: '🎌' },
  { id: 'figures', label: 'Figures & Collectibles', icon: '🗿' },
];

const CATEGORY_OPTIONS = [
  { id: 'collecting', label: 'Collecting', icon: <Crown className="w-5 h-5" /> },
  { id: 'investing', label: 'Investing', icon: <Sparkles className="w-5 h-5" /> },
  { id: 'trading', label: 'Trading', icon: <Swords className="w-5 h-5" /> },
  { id: 'gaming', label: 'Gaming', icon: <GamepadIcon className="w-5 h-5" /> },
];

type Step = 'profile' | 'games' | 'interests' | 'complete';

export const OnboardingWizard = ({ userId, email, initialDisplayName, onComplete }: OnboardingWizardProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('profile');
  const [displayName, setDisplayName] = useState(initialDisplayName || email.split('@')[0]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const steps: Step[] = ['profile', 'games', 'interests', 'complete'];
  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success('Avatar uploaded!');
    } catch (err) {
      toast.error('Failed to upload avatar');
    }
    setUploadingAvatar(false);
  };

  const toggleGame = (gameId: string) => {
    setSelectedGames(prev => 
      prev.includes(gameId) 
        ? prev.filter(g => g !== gameId)
        : [...prev, gameId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleNext = () => {
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          avatar_url: avatarUrl || null,
          preferred_games: selectedGames,
          preferred_categories: selectedCategories,
          onboarding_completed: true,
          onboarding_step: 4,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Welcome to CardBoom! 🎉');
      onComplete();
    } catch (err) {
      toast.error('Failed to save preferences');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="p-4 border-b border-border/50">
        <div className="max-w-lg mx-auto">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Step {currentStepIndex + 1} of {steps.length}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {/* Step 1: Profile */}
            {step === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold">Let's set up your profile</h1>
                  <p className="text-muted-foreground">Tell us a bit about yourself</p>
                </div>

                <div className="flex justify-center">
                  <label className="relative cursor-pointer group">
                    <Avatar className="w-24 h-24 ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                        {displayName?.[0]?.toUpperCase() || <User className="w-8 h-8" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                      {uploadingAvatar ? (
                        <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 text-primary-foreground" />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="h-12"
                  />
                </div>

                <Button onClick={handleNext} className="w-full h-12" disabled={!displayName.trim()}>
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: Games */}
            {step === 'games' && (
              <motion.div
                key="games"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold">What do you collect?</h1>
                  <p className="text-muted-foreground">Select your favorite games and collectibles</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {GAME_OPTIONS.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => toggleGame(game.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedGames.includes(game.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-2xl">{game.icon}</span>
                      <p className="font-medium mt-2 text-sm">{game.label}</p>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleBack} className="flex-1 h-12">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1 h-12">
                    {selectedGames.length === 0 ? 'Skip' : 'Continue'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Interests */}
            {step === 'interests' && (
              <motion.div
                key="interests"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold">What's your goal?</h1>
                  <p className="text-muted-foreground">We'll personalize your experience</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {CATEGORY_OPTIONS.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                        selectedCategories.includes(category.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${
                        selectedCategories.includes(category.id) ? 'bg-primary/20' : 'bg-secondary'
                      }`}>
                        {category.icon}
                      </div>
                      <p className="font-medium">{category.label}</p>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleBack} className="flex-1 h-12">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1 h-12">
                    {selectedCategories.length === 0 ? 'Skip' : 'Continue'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Complete */}
            {step === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6 text-center"
              >
                <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-bold">You're all set, {displayName}!</h1>
                  <p className="text-muted-foreground">Welcome to the CardBoom community</p>
                </div>

                <div className="p-4 bg-secondary/50 rounded-xl space-y-2">
                  <p className="text-sm font-medium">Here's what you can do next:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 text-left">
                    <li>• Browse the marketplace</li>
                    <li>• Add cards to your watchlist</li>
                    <li>• Start building your collection</li>
                  </ul>
                </div>

                <Button 
                  onClick={handleComplete} 
                  className="w-full h-12"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Enter CardBoom
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
