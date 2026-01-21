import { useState } from 'react';
import { Flag, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';

interface PriceReportButtonProps {
  catalogCardId?: string;
  marketItemId?: string;
  listingId?: string;
  currentPrice?: number;
  cardName: string;
}

const REPORT_REASONS = [
  { value: 'too_high', label: 'Price is too high' },
  { value: 'too_low', label: 'Price is too low' },
  { value: 'outdated', label: 'Price is outdated' },
  { value: 'wrong_card', label: 'Wrong card / variant' },
  { value: 'other', label: 'Other issue' },
];

export function PriceReportButton({
  catalogCardId,
  marketItemId,
  listingId,
  currentPrice,
  cardName,
}: PriceReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reason, setReason] = useState('');
  const [expectedPrice, setExpectedPrice] = useState('');
  const [notes, setNotes] = useState('');
  const { formatPrice } = useCurrency();

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert price report
      const { error: reportError } = await supabase
        .from('price_reports')
        .insert({
          catalog_card_id: catalogCardId || null,
          market_item_id: marketItemId || null,
          listing_id: listingId || null,
          user_id: user?.id || null,
          reported_price: currentPrice || null,
          expected_price: expectedPrice ? parseFloat(expectedPrice) : null,
          report_reason: reason,
          notes: notes || null,
        });

      if (reportError) throw reportError;

      // Notify admins
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'moderator']);

      if (admins && admins.length > 0) {
        const adminNotifications = admins.map(admin => ({
          user_id: admin.user_id,
          type: 'price_report',
          title: '🚨 Price Report Submitted',
          body: `User reported wrong price for "${cardName}": ${REPORT_REASONS.find(r => r.value === reason)?.label}`,
          data: { 
            catalog_card_id: catalogCardId,
            market_item_id: marketItemId,
            reported_price: currentPrice,
            expected_price: expectedPrice ? parseFloat(expectedPrice) : null,
          },
        }));
        
        await supabase.from('notifications').insert(adminNotifications);
      }

      setSubmitted(true);
      toast.success('Thank you! Your report has been submitted.');
      
      setTimeout(() => {
        setOpen(false);
        // Reset form after close animation
        setTimeout(() => {
          setSubmitted(false);
          setReason('');
          setExpectedPrice('');
          setNotes('');
        }, 300);
      }, 1500);
    } catch (error) {
      console.error('Error submitting price report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            <Check className="w-4 h-4 mr-1 text-green-500" />
            Reported
          </Button>
        </DialogTrigger>
        <DialogContent>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-lg font-medium">Report Submitted!</p>
            <p className="text-sm text-muted-foreground text-center">
              Our team will review this price and update it if needed.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
          <Flag className="w-4 h-4 mr-1" />
          Report Price
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Report Wrong Price
          </DialogTitle>
          <DialogDescription>
            Help us improve pricing accuracy for <span className="font-medium text-foreground">{cardName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {currentPrice !== undefined && currentPrice > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Current displayed price</p>
              <p className="text-xl font-bold">{formatPrice(currentPrice)}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>What's wrong with this price?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected">What should the price be? (optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="expected"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={expectedPrice}
                onChange={(e) => setExpectedPrice(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="E.g., I saw this card selling for $X on TCGPlayer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !reason}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
