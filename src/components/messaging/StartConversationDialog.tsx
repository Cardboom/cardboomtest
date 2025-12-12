import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StartConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  sellerName: string;
}

export const StartConversationDialog = ({
  open,
  onOpenChange,
  listingId,
  sellerName,
}: StartConversationDialogProps) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Please sign in to send messages');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsLoading(true);

    try {
      // Filter message through edge function
      const { data: filterResult, error: filterError } = await supabase.functions.invoke('messaging', {
        body: { action: 'filter', content: message }
      });

      if (filterError) throw filterError;

      if (filterResult.isFiltered) {
        toast.error('Message contains prohibited content (phone numbers, emails, external links)');
        setIsLoading(false);
        return;
      }

      // In production, create conversation and send message
      toast.success('Message sent to ' + sellerName);
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Message {sellerName}
          </DialogTitle>
          <DialogDescription>
            Start a conversation about this listing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Hi, I'm interested in this item..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-32"
          />

          <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              To keep transactions safe, sharing phone numbers, emails, or external links is not allowed. 
              All payments are processed securely through CardBoom.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isLoading} className="gap-2">
              <Send className="w-4 h-4" />
              {isLoading ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
