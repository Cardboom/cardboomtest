import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface DetectedCardData {
  id: string;
  cardName: string | null;
  cardNameEnglish: string | null;
  setName: string | null;
  setCode: string | null;
  cardNumber: string | null;
  rarity: string | null;
  category: string | null;
  condition: string;
  confidence: number;
  suggestedPrice: number;
  isConfirmed: boolean;
  needsReview: boolean;
}

interface MultiCardReviewTabsProps {
  imagePreviewUrl: string;
  detectedCards: DetectedCardData[];
  onCardUpdate: (cardId: string, updates: Partial<DetectedCardData>) => void;
  onCardConfirm: (cardId: string) => void;
  onAllConfirmed: () => void;
  isProcessing?: boolean;
}

const CONDITIONS = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'];
const CATEGORIES = [
  { value: 'pokemon', label: 'Pokémon' },
  { value: 'yugioh', label: 'Yu-Gi-Oh!' },
  { value: 'mtg', label: 'Magic: The Gathering' },
  { value: 'onepiece', label: 'One Piece' },
  { value: 'lorcana', label: 'Lorcana' },
  { value: 'sports', label: 'Sports Cards' },
  { value: 'tcg', label: 'Other TCG' },
];

export const MultiCardReviewTabs = ({
  imagePreviewUrl,
  detectedCards,
  onCardUpdate,
  onCardConfirm,
  onAllConfirmed,
  isProcessing = false,
}: MultiCardReviewTabsProps) => {
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState(detectedCards[0]?.id || '');
  
  const confirmedCount = detectedCards.filter(c => c.isConfirmed).length;
  const allConfirmed = confirmedCount === detectedCards.length;
  
  const currentIndex = detectedCards.findIndex(c => c.id === activeTab);
  const hasNext = currentIndex < detectedCards.length - 1;
  const hasPrev = currentIndex > 0;

  const handleConfirmAndNext = (cardId: string) => {
    onCardConfirm(cardId);
    
    // Move to next unconfirmed card
    const nextUnconfirmed = detectedCards.find((c, i) => i > currentIndex && !c.isConfirmed);
    if (nextUnconfirmed) {
      setActiveTab(nextUnconfirmed.id);
    } else if (hasNext) {
      setActiveTab(detectedCards[currentIndex + 1].id);
    }
  };

  const goToNext = () => {
    if (hasNext) setActiveTab(detectedCards[currentIndex + 1].id);
  };

  const goToPrev = () => {
    if (hasPrev) setActiveTab(detectedCards[currentIndex - 1].id);
  };

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {detectedCards.length} cards detected
          </Badge>
          <Badge 
            className={confirmedCount === detectedCards.length 
              ? 'bg-gain/20 text-gain' 
              : 'bg-primary/20 text-primary'
            }
          >
            {confirmedCount}/{detectedCards.length} confirmed
          </Badge>
        </div>
        
        {allConfirmed && (
          <Button onClick={onAllConfirmed} disabled={isProcessing} className="gap-2">
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Import All Cards
          </Button>
        )}
      </div>

      {/* Image Preview */}
      <div className="relative rounded-lg overflow-hidden bg-muted/30 aspect-video max-h-48">
        <img
          src={imagePreviewUrl}
          alt="Source image"
          className="w-full h-full object-contain"
        />
        <div className="absolute top-2 left-2">
          <Badge className="bg-background/80 backdrop-blur-sm text-foreground">
            Source Image
          </Badge>
        </div>
      </div>

      {/* Card Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToPrev}
            disabled={!hasPrev}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <TabsList className="flex-1 justify-start overflow-x-auto scrollbar-hide">
            {detectedCards.map((card, index) => (
              <TabsTrigger
                key={card.id}
                value={card.id}
                className="relative gap-2 min-w-fit data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span className="truncate max-w-[120px]">
                  {card.cardName || `Card ${index + 1}`}
                </span>
                {card.isConfirmed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-gain shrink-0" />
                ) : card.needsReview ? (
                  <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToNext}
            disabled={!hasNext}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {detectedCards.map((card) => (
          <TabsContent key={card.id} value={card.id} className="mt-0">
            <div className="border rounded-lg p-4 space-y-4 bg-card">
              {/* Confidence indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {card.confidence >= 0.7 ? (
                    <Badge className="bg-gain/20 text-gain border-gain/30">
                      {Math.round(card.confidence * 100)}% confidence
                    </Badge>
                  ) : card.confidence >= 0.4 ? (
                    <Badge className="bg-warning/20 text-warning border-warning/30">
                      {Math.round(card.confidence * 100)}% confidence
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      Low confidence - please verify
                    </Badge>
                  )}
                  
                  {card.isConfirmed && (
                    <Badge className="bg-gain/20 text-gain">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Confirmed
                    </Badge>
                  )}
                </div>
              </div>

              {/* Card Details Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Card Name</label>
                  <Input
                    value={card.cardName || ''}
                    onChange={(e) => onCardUpdate(card.id, { cardName: e.target.value })}
                    placeholder="Enter card name"
                    className="h-9"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Set</label>
                  <Input
                    value={card.setName || ''}
                    onChange={(e) => onCardUpdate(card.id, { setName: e.target.value })}
                    placeholder="Set name"
                    className="h-9"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={card.category || 'tcg'}
                    onValueChange={(val) => onCardUpdate(card.id, { category: val })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Condition</label>
                  <Select
                    value={card.condition}
                    onValueChange={(val) => onCardUpdate(card.id, { condition: val })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map(cond => (
                        <SelectItem key={cond} value={cond}>
                          {cond}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Card Number</label>
                  <Input
                    value={card.cardNumber || ''}
                    onChange={(e) => onCardUpdate(card.id, { cardNumber: e.target.value })}
                    placeholder="e.g. 025/198"
                    className="h-9"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price (USD)</label>
                  <Input
                    type="number"
                    value={card.suggestedPrice || ''}
                    onChange={(e) => onCardUpdate(card.id, { suggestedPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="h-9"
                  />
                </div>
              </div>

              {/* Extra details row */}
              {(card.rarity || card.setCode) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {card.setCode && <Badge variant="outline">{card.setCode}</Badge>}
                  {card.rarity && <Badge variant="outline">{card.rarity}</Badge>}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Review the detected information and confirm when ready
                </p>
                
                <Button
                  onClick={() => handleConfirmAndNext(card.id)}
                  disabled={card.isConfirmed || !card.cardName}
                  className="gap-2"
                >
                  {card.isConfirmed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmed
                    </>
                  ) : hasNext ? (
                    <>
                      Confirm & Next
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
