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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeftRight, Search, Plus, Minus, Send } from 'lucide-react';
import { toast } from 'sonner';

interface ProposeTradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProposeTradeDialog = ({ open, onOpenChange }: ProposeTradeDialogProps) => {
  const [recipientSearch, setRecipientSearch] = useState('');
  const [myItemsSearch, setMyItemsSearch] = useState('');
  const [theirItemsSearch, setTheirItemsSearch] = useState('');
  const [cashAdjustment, setCashAdjustment] = useState('');
  const [cashFromMe, setCashFromMe] = useState(false);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data
  const MOCK_MY_ITEMS = [
    { id: '1', name: 'Charizard Base Set PSA 10', value: 420000 },
    { id: '2', name: 'LeBron James Rookie PSA 10', value: 245000 },
  ];

  const [selectedMyItems, setSelectedMyItems] = useState<string[]>([]);
  const [selectedTheirItems, setSelectedTheirItems] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (selectedMyItems.length === 0) {
      toast.error('Please select items to trade');
      return;
    }

    setIsLoading(true);

    try {
      toast.success('Trade proposal sent!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to send trade proposal');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
    return `$${price.toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Propose a Trade
          </DialogTitle>
          <DialogDescription>
            Select items from your portfolio and theirs to create a trade offer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Recipient */}
          <div className="space-y-2">
            <Label>Trade Partner</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* My Items */}
            <div className="space-y-3">
              <Label>Items You Offer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search your portfolio..."
                  value={myItemsSearch}
                  onChange={(e) => setMyItemsSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="border border-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                {MOCK_MY_ITEMS.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (selectedMyItems.includes(item.id)) {
                        setSelectedMyItems(prev => prev.filter(i => i !== item.id));
                      } else {
                        setSelectedMyItems(prev => [...prev, item.id]);
                      }
                    }}
                    className={`p-3 cursor-pointer hover:bg-secondary transition-colors flex items-center justify-between ${
                      selectedMyItems.includes(item.id) ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div>
                      <p className="text-foreground text-sm">{item.name}</p>
                      <p className="text-muted-foreground text-xs">{formatPrice(item.value)}</p>
                    </div>
                    {selectedMyItems.includes(item.id) ? (
                      <Minus className="w-4 h-4 text-loss" />
                    ) : (
                      <Plus className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Their Items */}
            <div className="space-y-3">
              <Label>Items You Want</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search their items..."
                  value={theirItemsSearch}
                  onChange={(e) => setTheirItemsSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="border border-border rounded-lg p-3 text-center text-muted-foreground text-sm">
                Enter a username to see their tradeable items
              </div>
            </div>
          </div>

          {/* Cash Adjustment */}
          <div className="space-y-3">
            <Label>Cash Adjustment (optional)</Label>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={cashAdjustment}
                  onChange={(e) => setCashAdjustment(e.target.value)}
                  className="pl-7"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className={!cashFromMe ? 'text-foreground' : 'text-muted-foreground'}>I receive</span>
                <Switch
                  checked={cashFromMe}
                  onCheckedChange={setCashFromMe}
                />
                <span className={cashFromMe ? 'text-foreground' : 'text-muted-foreground'}>I pay</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Message (optional)</Label>
            <Textarea
              placeholder="Add a message to your trade offer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
              <Send className="w-4 h-4" />
              {isLoading ? 'Sending...' : 'Send Trade Proposal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
