import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CreditCard, Plus, Trash2, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SavedCard {
  id: string;
  card_token: string;
  card_user_key: string;
  last_four: string;
  card_brand: string | null;
  card_family: string | null;
  card_bank_name: string | null;
  card_label: string | null;
  is_default: boolean;
}

interface SavedCardsSelectorProps {
  selectedCardId: string | 'new';
  onSelectCard: (cardId: string | 'new') => void;
  onCardSelected?: (card: SavedCard | null) => void;
}

export const SavedCardsSelector = ({
  selectedCardId,
  onSelectCard,
  onCardSelected,
}: SavedCardsSelectorProps) => {
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedCards();
  }, []);

  const fetchSavedCards = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('saved_cards')
        .select('*')
        .eq('user_id', session.user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedCards(data || []);

      // Auto-select default card if no card is selected
      if (data && data.length > 0 && selectedCardId === 'new') {
        const defaultCard = data.find(c => c.is_default) || data[0];
        onSelectCard(defaultCard.id);
        onCardSelected?.(defaultCard);
      }
    } catch (err) {
      console.error('Error fetching saved cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      setDeletingId(cardId);
      const { error } = await supabase
        .from('saved_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      setSavedCards(prev => prev.filter(c => c.id !== cardId));
      toast.success('Card removed');

      if (selectedCardId === cardId) {
        onSelectCard('new');
        onCardSelected?.(null);
      }
    } catch (err) {
      toast.error('Failed to remove card');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (cardId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // First, unset all defaults
      await supabase
        .from('saved_cards')
        .update({ is_default: false })
        .eq('user_id', session.user.id);

      // Then set the new default
      const { error } = await supabase
        .from('saved_cards')
        .update({ is_default: true })
        .eq('id', cardId);

      if (error) throw error;

      setSavedCards(prev =>
        prev.map(c => ({ ...c, is_default: c.id === cardId }))
      );
      toast.success('Default card updated');
    } catch (err) {
      toast.error('Failed to update default card');
    }
  };

  const handleCardChange = (cardId: string | 'new') => {
    onSelectCard(cardId);
    if (cardId === 'new') {
      onCardSelected?.(null);
    } else {
      const card = savedCards.find(c => c.id === cardId);
      onCardSelected?.(card || null);
    }
  };

  const getCardIcon = (brand: string | null) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      default:
        return '💳';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Payment Method</Label>
      
      <RadioGroup value={selectedCardId} onValueChange={handleCardChange}>
        {savedCards.map((card) => (
          <div
            key={card.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-all",
              selectedCardId === card.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <RadioGroupItem value={card.id} id={card.id} />
            <Label
              htmlFor={card.id}
              className="flex-1 flex items-center gap-3 cursor-pointer"
            >
              <span className="text-xl">{getCardIcon(card.card_brand)}</span>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {card.card_label || `${card.card_brand || 'Card'} •••• ${card.last_four}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {card.card_bank_name || card.card_family || 'Credit/Debit Card'} •••• {card.last_four}
                </p>
              </div>
              {card.is_default && (
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              )}
            </Label>
            <div className="flex items-center gap-1">
              {!card.is_default && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetDefault(card.id);
                  }}
                  title="Set as default"
                >
                  <Star className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCard(card.id);
                }}
                disabled={deletingId === card.id}
              >
                {deletingId === card.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}

        {/* Add new card option */}
        <div
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border transition-all",
            selectedCardId === 'new'
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          )}
        >
          <RadioGroupItem value="new" id="new-card" />
          <Label
            htmlFor="new-card"
            className="flex-1 flex items-center gap-3 cursor-pointer"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Add New Card</p>
              <p className="text-xs text-muted-foreground">Enter card details manually</p>
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};

export type { SavedCard };
