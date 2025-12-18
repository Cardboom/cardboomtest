import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Twitter, MessageCircle, Link2, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ShareCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creator: {
    creator_name: string;
    bio?: string;
    accuracy_rate?: number;
    total_calls?: number;
  };
  username: string;
}

export const ShareCreatorDialog = ({ 
  open, 
  onOpenChange, 
  creator, 
  username 
}: ShareCreatorDialogProps) => {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = `${window.location.origin}/@${username}`;
  const shareText = `Check out @${username}'s market calls on CardBoom! ${creator.accuracy_rate ? `${creator.accuracy_rate}% accuracy over ${creator.total_calls} calls.` : ''}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const shareToDiscord = () => {
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    toast.success('Copied for Discord!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {creator.creator_name}'s Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* URL Copy */}
          <div className="flex gap-2">
            <Input 
              value={shareUrl} 
              readOnly 
              className="font-mono text-sm"
            />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 text-gain" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="flex flex-col gap-1 h-auto py-3"
              onClick={shareToTwitter}
            >
              <Twitter className="h-5 w-5" />
              <span className="text-xs">Twitter/X</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col gap-1 h-auto py-3"
              onClick={shareToDiscord}
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs">Discord</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col gap-1 h-auto py-3"
              onClick={handleCopy}
            >
              <Link2 className="h-5 w-5" />
              <span className="text-xs">Copy Link</span>
            </Button>
          </div>

          {/* Embed Code */}
          <div className="pt-2 border-t">
            <p className="text-sm font-medium mb-2">Embed in Bio</p>
            <code className="block p-2 bg-muted rounded text-xs break-all">
              cardboom.app/@{username}
            </code>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
