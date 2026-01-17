import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Package } from 'lucide-react';
import { toast } from 'sonner';
import { formatCategoryName } from '@/lib/categoryFormatter';
import { supabase } from '@/integrations/supabase/client';

interface AddToPortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface MarketItem {
  id: string;
  name: string;
  category: string;
  image_url?: string;
  current_price?: number;
}

export const AddToPortfolioDialog = ({ open, onOpenChange, onSuccess }: AddToPortfolioDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MarketItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null);
  const [customName, setCustomName] = useState('');
  const [category, setCategory] = useState('pokemon');
  const [grade, setGrade] = useState('raw');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [mode, setMode] = useState<'search' | 'custom'>('search');

  // Search for market items
  useEffect(() => {
    const searchMarket = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('market_items')
          .select('id, name, category, image_url, current_price')
          .ilike('name', `%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchMarket, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to add items');
      return;
    }

    if (mode === 'search' && !selectedItem) {
      toast.error('Please select an item from search');
      return;
    }

    if (mode === 'custom' && !customName.trim()) {
      toast.error('Please enter a card name');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from('portfolio_items').insert({
        user_id: user.id,
        market_item_id: mode === 'search' ? selectedItem?.id : null,
        custom_name: mode === 'custom' ? customName.trim() : null,
        grade: grade as 'raw' | 'psa10' | 'psa9' | 'psa8' | 'psa7' | 'bgs10' | 'bgs9_5' | 'cgc10',
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        quantity: parseInt(quantity) || 1,
        notes: notes.trim() || null,
        image_url: selectedItem?.image_url || null,
      });

      if (error) throw error;

      toast.success('Added to your portfolio!');
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setSearchQuery('');
      setSelectedItem(null);
      setCustomName('');
      setGrade('raw');
      setPurchasePrice('');
      setQuantity('1');
      setNotes('');
      setMode('search');
    } catch (error) {
      console.error('Error adding to portfolio:', error);
      toast.error('Failed to add to portfolio');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Add to Digital Vault
          </DialogTitle>
          <DialogDescription>
            Track cards in your collection without listing for sale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode selector */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'search' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('search')}
              className="flex-1"
            >
              <Search className="w-4 h-4 mr-1" />
              Search Catalog
            </Button>
            <Button
              variant={mode === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('custom')}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-1" />
              Custom Entry
            </Button>
          </div>

          {mode === 'search' ? (
            <>
              {/* Search */}
              <div className="space-y-2">
                <Label>Search Cards</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by card name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedItem(null);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchQuery && (
                <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {isSearching ? (
                    <p className="p-3 text-sm text-muted-foreground">Searching...</p>
                  ) : searchResults.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      <p>No results found</p>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto"
                        onClick={() => {
                          setMode('custom');
                          setCustomName(searchQuery);
                        }}
                      >
                        Add as custom entry instead
                      </Button>
                    </div>
                  ) : (
                    searchResults.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedItem(item);
                          setSearchQuery(item.name);
                        }}
                        className={`p-3 cursor-pointer hover:bg-secondary transition-colors flex items-center gap-3 ${
                          selectedItem?.id === item.id ? 'bg-primary/10' : ''
                        }`}
                      >
                        {item.image_url && (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-10 h-14 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground font-medium truncate">{item.name}</p>
                          <p className="text-muted-foreground text-xs">{formatCategoryName(item.category)}</p>
                        </div>
                        {item.current_price && (
                          <span className="text-sm font-medium">${item.current_price.toFixed(2)}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedItem && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
                  {selectedItem.image_url && (
                    <img 
                      src={selectedItem.image_url} 
                      alt={selectedItem.name}
                      className="w-12 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{selectedItem.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCategoryName(selectedItem.category)}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Custom entry fields */}
              <div className="space-y-2">
                <Label>Card Name *</Label>
                <Input
                  placeholder="e.g. Charizard Base Set 1st Edition"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pokemon">Pokémon</SelectItem>
                    <SelectItem value="mtg">Magic: The Gathering</SelectItem>
                    <SelectItem value="yugioh">Yu-Gi-Oh!</SelectItem>
                    <SelectItem value="one_piece">One Piece</SelectItem>
                    <SelectItem value="lorcana">Disney Lorcana</SelectItem>
                    <SelectItem value="sports">Sports Cards</SelectItem>
                    <SelectItem value="figures">Collectible Figures</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Grade */}
          <div className="space-y-2">
            <Label>Condition / Grade</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw">Raw (Ungraded)</SelectItem>
                <SelectItem value="psa10">PSA 10</SelectItem>
                <SelectItem value="psa9">PSA 9</SelectItem>
                <SelectItem value="psa8">PSA 8</SelectItem>
                <SelectItem value="psa7">PSA 7</SelectItem>
                <SelectItem value="bgs10">BGS 10</SelectItem>
                <SelectItem value="bgs9_5">BGS 9.5</SelectItem>
                <SelectItem value="cgc10">CGC 10</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Purchase Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Purchase Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="pl-7"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any additional details about this card..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
              <Plus className="w-4 h-4" />
              {isLoading ? 'Adding...' : 'Add to Vault'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};