import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Gem, Gift, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TweetRewardClaimProps {
  onSuccess?: () => void;
}

export const TweetRewardClaim = ({ onSuccess }: TweetRewardClaimProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tweetUrl, setTweetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleClaim = async () => {
    if (!tweetUrl.trim()) {
      toast.error('Please enter your tweet URL');
      return;
    }

    // Basic URL validation
    if (!tweetUrl.match(/(?:twitter\.com|x\.com)\/\w+\/status\/\d+/)) {
      toast.error('Please enter a valid X/Twitter post URL');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please sign in to claim your reward');
        return;
      }

      const { data, error } = await supabase.functions.invoke('verify-tweet-reward', {
        body: { tweetUrl },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setIsSuccess(true);
      toast.success(`🎉 ${data.message}`);
      
      // Dispatch event for real-time balance update
      window.dispatchEvent(new CustomEvent('gems-balance-updated'));
      
      onSuccess?.();
      
      // Reset after delay
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
        setTweetUrl('');
      }, 2000);
    } catch (err) {
      console.error('Claim error:', err);
      toast.error('Failed to verify tweet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 bg-gradient-to-r from-primary/10 to-amber-500/10 border-primary/20 hover:border-primary/40"
        >
          <Gift className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">Claim Tweet Reward</span>
          <span className="sm:hidden">Claim</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center">
              <Gem className="w-5 h-5 text-white" />
            </div>
            Earn 50 Gems ($0.50)
          </DialogTitle>
          <DialogDescription>
            Tweet about CardBoom and earn gems!
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-lg font-semibold text-foreground">50 Gems Added!</p>
            <p className="text-sm text-muted-foreground">Thanks for spreading the word!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">How it works:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Post on X mentioning <span className="font-semibold text-primary">@cardboomcom</span></li>
                <li>Copy your tweet URL</li>
                <li>Paste it below to claim your gems!</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <a
                href="https://twitter.com/intent/tweet?text=Just%20discovered%20@cardboomcom%20-%20the%20best%20marketplace%20for%20trading%20cards!%20%F0%9F%94%A5"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0"
              >
                <Button variant="outline" size="sm" className="gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Post Now
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </a>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Tweet URL</label>
              <Input
                placeholder="https://x.com/yourhandle/status/..."
                value={tweetUrl}
                onChange={(e) => setTweetUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <Button 
              onClick={handleClaim} 
              disabled={isLoading || !tweetUrl.trim()}
              className="w-full gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Gem className="w-4 h-4" />
                  Claim 50 Gems
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              One reward per tweet. Tweets must mention @cardboomcom.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TweetRewardClaim;
