import { useState } from 'react';
import { Camera, Shield, Upload, X, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface CollectiveVerificationDialogProps {
  collectiveListingId: string;
  itemName: string;
  lastVerifiedAt?: string;
  onVerified?: () => void;
}

export function CollectiveVerificationDialog({
  collectiveListingId,
  itemName,
  lastVerifiedAt,
  onVerified
}: CollectiveVerificationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  const isOverdue = lastVerifiedAt && 
    new Date().getTime() - new Date(lastVerifiedAt).getTime() > 24 * 60 * 60 * 1000;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerify = async () => {
    if (!photoFile) {
      toast.error('Please upload a verification photo');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to verify');
        return;
      }

      // Upload photo
      const fileName = `${collectiveListingId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('fractional-verifications')
        .upload(fileName, photoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('fractional-verifications')
        .getPublicUrl(fileName);

      // Create verification record
      const { error: verifyError } = await supabase
        .from('fractional_verifications')
        .insert({
          fractional_listing_id: collectiveListingId,
          verified_by: user.id,
          photo_url: publicUrl,
          notes: notes || null,
          status: 'verified',
          verified_at: new Date().toISOString(),
        });

      if (verifyError) throw verifyError;

      // Update listing timestamps
      const { error: updateError } = await supabase
        .from('fractional_listings')
        .update({
          last_verified_at: new Date().toISOString(),
          next_verification_due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', collectiveListingId);

      if (updateError) throw updateError;

      toast.success('Verification submitted successfully!');
      setOpen(false);
      setPhotoPreview(null);
      setPhotoFile(null);
      setNotes('');
      onVerified?.();
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={isOverdue ? "destructive" : "outline"} 
          className="gap-2 w-full"
        >
          <Shield className="h-4 w-4" />
          {isOverdue ? 'Verification Overdue' : 'Verify Condition'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Daily Verification
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Upload a timestamped photo of <span className="font-medium text-foreground">{itemName}</span> to verify its condition for Collective members.
          </p>

          {/* Photo Upload */}
          <div className="relative">
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Verification"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => {
                    setPhotoPreview(null);
                    setPhotoFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Camera className="h-12 w-12 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              placeholder="Any observations about the item's condition..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Guidelines */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Photo guidelines:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Show the full item clearly</li>
              <li>Include today's date/newspaper if possible</li>
              <li>Good lighting, no blur</li>
            </ul>
          </div>

          {/* Last Verification */}
          {lastVerifiedAt && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Last verified</span>
              </div>
              <Badge variant={isOverdue ? "destructive" : "secondary"}>
                {formatDistanceToNow(new Date(lastVerifiedAt), { addSuffix: true })}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={loading || !photoFile} className="flex-1 gap-2">
            {loading ? (
              "Submitting..."
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Submit Verification
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
