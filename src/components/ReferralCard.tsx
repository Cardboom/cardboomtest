import { Gift, Copy, Share2, Users, Coins } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useReferral } from '@/hooks/useReferral';

export const ReferralCard = () => {
  const {
    referralCode,
    referrals,
    totalEarned,
    loading,
    copyReferralCode,
    shareReferralLink,
  } = useReferral();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/2" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingCount = referrals.filter(r => r.status === 'pending').length;
  const completedCount = referrals.filter(r => r.status === 'completed' || r.status === 'rewarded').length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <CardTitle>Invite Friends & Earn</CardTitle>
        </div>
        <CardDescription>
          Earn ₺50 for every friend who makes their first purchase
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Referral Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Referral Code</label>
          <div className="flex gap-2">
            <Input
              value={referralCode || 'Loading...'}
              readOnly
              className="font-mono text-center text-lg"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={copyReferralCode}>
              <Copy className="h-4 w-4" />
              Copy Code
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={shareReferralLink}>
              <Share2 className="h-4 w-4" />
              Copy URL
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{referrals.length}</div>
            <div className="text-xs text-muted-foreground">Invited</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Gift className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{completedCount}</div>
            <div className="text-xs text-muted-foreground">Converted</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Coins className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">₺{totalEarned}</div>
            <div className="text-xs text-muted-foreground">Earned</div>
          </div>
        </div>

        {/* Recent Referrals */}
        {referrals.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Referrals</h4>
            <div className="space-y-2">
              {referrals.slice(0, 5).map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <span className="text-sm">
                    Referral #{referral.id.slice(0, 8)}
                  </span>
                  <Badge
                    variant={
                      referral.status === 'rewarded'
                        ? 'default'
                        : referral.status === 'completed'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {referral.status === 'rewarded'
                      ? `+₺${referral.reward_amount}`
                      : referral.status === 'completed'
                      ? 'Pending Reward'
                      : 'Waiting'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Notification */}
        {pendingCount > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>{pendingCount}</strong> friend{pendingCount > 1 ? 's' : ''} signed up! They just need to make their first purchase for you to earn.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
