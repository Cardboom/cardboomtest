import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';
import { CardAnalysis } from '@/hooks/useCardAnalysis';

export interface ReviewedCardData {
  cardName: string;
  cardNameEnglish: string;
  setName: string;
  setCode: string;
  cardNumber: string;
  rarity: string;
  category: string;
  language: string;
  cviKey: string | null;
  confidence: number;
}

interface CardReviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: ReviewedCardData) => void;
  analysis: CardAnalysis | null;
  imagePreview?: string | null;
}

const CATEGORIES = [
  { value: 'pokemon', label: 'Pokémon' },
  { value: 'mtg', label: 'Magic: The Gathering' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!' },
  { value: 'onepiece', label: 'One Piece' },
  { value: 'lorcana', label: 'Lorcana' },
  { value: 'nba', label: 'NBA/Basketball' },
  { value: 'football', label: 'Football' },
  { value: 'baseball', label: 'Baseball' },
  { value: 'soccer', label: 'Soccer' },
  { value: 'tcg', label: 'Other TCG' },
  { value: 'figures', label: 'Figures' },
];

const LANGUAGES = [
  'English', 'Japanese', 'Korean', 'Chinese', 'German', 'French', 'Spanish', 'Italian', 'Portuguese', 'Other'
];

const RARITIES = [
  'Common', 'Uncommon', 'Rare', 'Holo Rare', 'Ultra Rare', 'Secret Rare', 'Illustration Rare', 
  'Special Art Rare', 'Hyper Rare', 'Promo', 'Mythic Rare', 'Legendary', 'Other'
];

export function CardReviewModal({ open, onClose, onConfirm, analysis, imagePreview }: CardReviewModalProps) {
  const [formData, setFormData] = useState<ReviewedCardData>({
    cardName: analysis?.cardName || '',
    cardNameEnglish: (analysis as any)?.cardNameEnglish || analysis?.cardName || '',
    setName: analysis?.setName || '',
    setCode: (analysis as any)?.setCode || '',
    cardNumber: analysis?.cardNumber || '',
    rarity: (analysis as any)?.rarity || '',
    category: analysis?.category || 'tcg',
    language: (analysis as any)?.language || 'English',
    cviKey: (analysis as any)?.cviKey || null,
    confidence: analysis?.confidence || 0,
  });

  // Update form when analysis changes
  useState(() => {
    if (analysis) {
      setFormData({
        cardName: analysis.cardName || '',
        cardNameEnglish: (analysis as any)?.cardNameEnglish || analysis?.cardName || '',
        setName: analysis.setName || '',
        setCode: (analysis as any)?.setCode || '',
        cardNumber: analysis.cardNumber || '',
        rarity: (analysis as any)?.rarity || '',
        category: analysis.category || 'tcg',
        language: (analysis as any)?.language || 'English',
        cviKey: (analysis as any)?.cviKey || null,
        confidence: analysis.confidence || 0,
      });
    }
  });

  const handleChange = (field: keyof ReviewedCardData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Regenerate cvi_key when relevant fields change
      if (['category', 'setCode', 'cardNumber', 'language'].includes(field)) {
        const gameMap: Record<string, string> = {
          'pokemon': 'Pokemon',
          'mtg': 'MTG',
          'yugioh': 'Yu-Gi-Oh',
          'onepiece': 'One Piece',
          'lorcana': 'Lorcana',
          'nba': 'Sports',
          'football': 'Sports',
          'baseball': 'Sports',
          'soccer': 'Sports',
        };
        const game = gameMap[updated.category] || 'Other';
        if (updated.setCode && updated.cardNumber) {
          updated.cviKey = `${game}|${updated.setCode}|${updated.cardNumber}|${updated.language}`;
        } else {
          updated.cviKey = null;
        }
      }
      
      return updated;
    });
  };

  const handleConfirm = () => {
    onConfirm(formData);
  };

  const confidencePercent = Math.round((formData.confidence || 0) * 100);
  const isLowConfidence = confidencePercent < 75;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {isLowConfidence ? (
                <AlertTriangle className="h-5 w-5 text-warning" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary" />
              )}
              Confirm Card Details
            </DialogTitle>
            <Badge variant="outline" className="gap-1.5 text-xs font-normal">
              <Sparkles className="h-3 w-3" />
              Powered by Brainbaby AI
            </Badge>
          </div>
          <DialogDescription>
            {isLowConfidence 
              ? 'Some fields could not be confirmed. Please review and correct the card details before saving.'
              : 'AI has identified your card. Please verify and make any corrections below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-4">
          {/* Image Preview */}
          {imagePreview && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Card Image</Label>
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden border bg-muted">
                <img src={imagePreview} alt="Card preview" className="w-full h-full object-contain" />
                <div className="absolute top-2 right-2">
                  <Badge variant={isLowConfidence ? "outline" : "default"} className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI {confidencePercent}%
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardName">Card Name (Original)</Label>
              <Input
                id="cardName"
                value={formData.cardName}
                onChange={(e) => handleChange('cardName', e.target.value)}
                placeholder="Enter card name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardNameEnglish">Card Name (English)</Label>
              <Input
                id="cardNameEnglish"
                value={formData.cardNameEnglish}
                onChange={(e) => handleChange('cardNameEnglish', e.target.value)}
                placeholder="English name if different"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="category">Game/Category</Label>
                <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select game" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={formData.language} onValueChange={(v) => handleChange('language', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="setName">Set Name</Label>
              <Input
                id="setName"
                value={formData.setName}
                onChange={(e) => handleChange('setName', e.target.value)}
                placeholder="e.g. Scarlet & Violet"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="setCode">Set Code</Label>
                <Input
                  id="setCode"
                  value={formData.setCode}
                  onChange={(e) => handleChange('setCode', e.target.value)}
                  placeholder="e.g. SV01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  value={formData.cardNumber}
                  onChange={(e) => handleChange('cardNumber', e.target.value)}
                  placeholder="e.g. 025/198"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rarity">Rarity</Label>
              <Select value={formData.rarity} onValueChange={(v) => handleChange('rarity', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rarity" />
                </SelectTrigger>
                <SelectContent>
                  {RARITIES.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.cviKey && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <Label className="text-xs font-medium text-muted-foreground">CVI Key (Auto-generated)</Label>
                <p className="text-sm font-mono mt-1 break-all">{formData.cviKey}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-row sm:gap-0">
          <p className="text-xs text-muted-foreground mr-auto hidden sm:block">
            You can edit these details in the listing form after confirmation
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">Cancel</Button>
            <Button onClick={handleConfirm} className="gap-2 flex-1 sm:flex-none">
              <CheckCircle2 className="h-4 w-4" />
              Confirm & Fill Form
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
