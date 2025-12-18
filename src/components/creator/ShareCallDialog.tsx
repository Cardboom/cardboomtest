import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Twitter, MessageCircle, Download, Check, TrendingUp, TrendingDown, Minus, Eye } from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ShareCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call: {
    id: string;
    call_type: string;
    price_at_call: number;
    thesis?: string;
    created_at: string;
    price_change_percent?: number;
    current_price?: number;
    market_item?: {
      id: string;
      name: string;
      current_price: number;
      image_url?: string;
    };
  };
  creatorUsername: string;
}

const callTypeConfig = {
  buy: { label: 'BUY', color: 'text-gain bg-gain/20', icon: TrendingUp },
  sell: { label: 'SELL', color: 'text-loss bg-loss/20', icon: TrendingDown },
  hold: { label: 'HOLD', color: 'text-amber-500 bg-amber-500/20', icon: Minus },
  watch: { label: 'WATCH', color: 'text-primary bg-primary/20', icon: Eye }
};

export const ShareCallDialog = ({ 
  open, 
  onOpenChange, 
  call,
  creatorUsername 
}: ShareCallDialogProps) => {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const config = callTypeConfig[call.call_type as keyof typeof callTypeConfig] || callTypeConfig.watch;
  const Icon = config.icon;
  
  const shareUrl = `${window.location.origin}/@${creatorUsername}/call/${call.id}`;
  const priceChange = call.price_change_percent || 0;
  const isPositive = priceChange > 0;
  
  const shareText = `📊 @${creatorUsername} called ${config.label} on ${call.market_item?.name} at $${call.price_at_call.toLocaleString()}${priceChange !== 0 ? ` — Now ${isPositive ? '+' : ''}${priceChange.toFixed(1)}%` : ''} #CardBoom`;

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Market Call</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preview Card */}
          <div ref={cardRef} className="p-4 border rounded-xl bg-gradient-to-br from-background to-muted/50">
            <div className="flex gap-4">
              {call.market_item?.image_url && (
                <img 
                  src={call.market_item.image_url}
                  alt={call.market_item.name}
                  className="w-24 h-32 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <Badge className={cn("mb-2 font-bold", config.color)}>
                  <Icon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
                <h3 className="font-semibold line-clamp-2">
                  {call.market_item?.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  by @{creatorUsername}
                </p>
                
                <div className="flex items-center gap-3 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Call Price</p>
                    <p className="font-bold">${call.price_at_call.toLocaleString()}</p>
                  </div>
                  {priceChange !== 0 && (
                    <div className={cn(
                      "px-2 py-1 rounded",
                      isPositive ? "bg-gain/20 text-gain" : "bg-loss/20 text-loss"
                    )}>
                      <p className="text-xs">Since Call</p>
                      <p className="font-bold">
                        {isPositive ? '+' : ''}{priceChange.toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(call.created_at), 'MMM d, yyyy')} · CardBoom
                </p>
              </div>
            </div>
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
              {copied ? (
                <Check className="h-5 w-5 text-gain" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
              <span className="text-xs">Copy Link</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
