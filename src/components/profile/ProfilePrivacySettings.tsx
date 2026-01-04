import { useState } from 'react';
import { Settings, Eye, EyeOff, Wallet, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ProfilePrivacySettingsProps {
  showCollectionCount: boolean;
  showPortfolioValue: boolean;
  onUpdate: (settings: { show_collection_count?: boolean; show_portfolio_value?: boolean }) => Promise<boolean>;
}

export const ProfilePrivacySettings = ({
  showCollectionCount,
  showPortfolioValue,
  onUpdate,
}: ProfilePrivacySettingsProps) => {
  const [open, setOpen] = useState(false);
  const [collectionVisible, setCollectionVisible] = useState(showCollectionCount);
  const [portfolioVisible, setPortfolioVisible] = useState(showPortfolioValue);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const success = await onUpdate({
      show_collection_count: collectionVisible,
      show_portfolio_value: portfolioVisible,
    });
    setSaving(false);
    if (success) {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Privacy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Profile Privacy Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-sm text-muted-foreground">
            Control what information visitors can see on your public profile.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label htmlFor="collection-toggle" className="font-medium">
                    Collection Count
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Show total number of items in your collection
                  </p>
                </div>
              </div>
              <Switch
                id="collection-toggle"
                checked={collectionVisible}
                onCheckedChange={setCollectionVisible}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gold/10">
                  <Wallet className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <Label htmlFor="portfolio-toggle" className="font-medium">
                    Portfolio Value
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Show your total portfolio value publicly
                  </p>
                </div>
              </div>
              <Switch
                id="portfolio-toggle"
                checked={portfolioVisible}
                onCheckedChange={setPortfolioVisible}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            {portfolioVisible ? (
              <Eye className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <p className="text-xs text-muted-foreground">
              {portfolioVisible
                ? 'Your portfolio value will be visible to all visitors'
                : 'Your portfolio value is hidden from visitors'}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
