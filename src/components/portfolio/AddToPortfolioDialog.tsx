import { useState } from 'react';
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
import { Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatCategoryName } from '@/lib/categoryFormatter';

interface AddToPortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddToPortfolioDialog = ({ open, onOpenChange }: AddToPortfolioDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [grade, setGrade] = useState('raw');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isLoading, setIsLoading] = useState(false);

  // Mock search results
  const MOCK_SEARCH_RESULTS = [
    { id: '1', name: 'Charizard Base Set', category: 'Pokemon' },
    { id: '2', name: 'LeBron James Rookie', category: 'Sports Cards' },
    { id: '3', name: 'Black Lotus Alpha', category: 'MTG' },
  ];

  const filteredResults = MOCK_SEARCH_RESULTS.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedItem) {
      toast.error('Please select an item');
      return;
    }

    setIsLoading(true);

    try {
      // In production, save to portfolio_items table
      toast.success('Added to portfolio');
      onOpenChange(false);
      // Reset form
      setSearchQuery('');
      setSelectedItem(null);
      setGrade('raw');
      setPurchasePrice('');
      setQuantity('1');
    } catch (error) {
      console.error('Error adding to portfolio:', error);
      toast.error('Failed to add to portfolio');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add to Portfolio
          </DialogTitle>
          <DialogDescription>
            Search for an item from the market or add a custom entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>Search Item</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search cards, figures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="border border-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
              {filteredResults.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No results found</p>
              ) : (
                filteredResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item.id);
                      setSearchQuery(item.name);
                    }}
                    className={`p-3 cursor-pointer hover:bg-secondary transition-colors ${
                      selectedItem === item.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <p className="text-foreground font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-xs">{formatCategoryName(item.category)}</p>
                  </div>
                ))
              )}
            </div>
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

          {/* Purchase Price */}
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

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
              <Plus className="w-4 h-4" />
              {isLoading ? 'Adding...' : 'Add to Portfolio'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
