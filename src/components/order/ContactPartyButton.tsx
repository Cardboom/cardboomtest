import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { StartConversationDialog } from '@/components/messaging/StartConversationDialog';

interface ContactPartyButtonProps {
  orderId: string;
  listingId: string;
  counterpartyId: string;
  counterpartyName: string;
  isBuyer: boolean;
}

export const ContactPartyButton = ({
  orderId,
  listingId,
  counterpartyId,
  counterpartyName,
  isBuyer,
}: ContactPartyButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();

  const handleClick = async () => {
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to send messages');
        navigate('/auth');
        return;
      }

      const currentUserId = session.user.id;

      // Check if conversation already exists for this listing
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${currentUserId},participant_2.eq.${counterpartyId}),and(participant_1.eq.${counterpartyId},participant_2.eq.${currentUserId})`)
        .eq('listing_id', listingId)
        .maybeSingle();

      if (existingConv) {
        // Navigate directly to messages
        navigate('/messages');
      } else {
        // Open dialog to start conversation
        setShowDialog(true);
      }
    } catch (error) {
      console.error('Error checking conversation:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MessageSquare className="w-4 h-4" />
        )}
        {isBuyer ? 'Message Seller' : 'Message Buyer'}
      </Button>

      <StartConversationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        listingId={listingId}
        sellerId={counterpartyId}
        sellerName={counterpartyName}
      />
    </>
  );
};
