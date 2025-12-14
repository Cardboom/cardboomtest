import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Shield, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FractionalVerificationDialogProps {
  fractionalListingId: string;
  itemName: string;
  lastVerifiedAt?: string;
  onVerified?: () => void;
}

export function FractionalVerificationDialog({ 
  fractionalListingId, 
  itemName,
  lastVerifiedAt,
  onVerified 
}: FractionalVerificationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      toast.error("Please upload a verification photo");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to verify");
        return;
      }

      // Upload photo
      const fileName = `${fractionalListingId}/${Date.now()}_${photoFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(fileName, photoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("listing-images")
        .getPublicUrl(fileName);

      // Create verification record
      const { error: verificationError } = await supabase
        .from("fractional_verifications")
        .insert({
          fractional_listing_id: fractionalListingId,
          verified_by: user.id,
          verification_type: "photo",
          photo_url: publicUrl,
          notes: notes || null,
        });

      if (verificationError) throw verificationError;

      // Update listing verification timestamps
      const { error: updateError } = await supabase
        .from("fractional_listings")
        .update({
          last_verified_at: new Date().toISOString(),
          next_verification_due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", fractionalListingId);

      if (updateError) throw updateError;

      toast.success("Verification submitted successfully!");
      setOpen(false);
      setPhotoPreview(null);
      setPhotoFile(null);
      setNotes("");
      onVerified?.();
    } catch (error: any) {
      console.error("Error submitting verification:", error);
      toast.error(error.message || "Failed to submit verification");
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = lastVerifiedAt && 
    new Date().getTime() - new Date(lastVerifiedAt).getTime() > 24 * 60 * 60 * 1000;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={isOverdue ? "destructive" : "outline"} 
          className="gap-2"
        >
          <Shield className="h-4 w-4" />
          {isOverdue ? "Verification Overdue!" : "Daily Verification"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Daily Verification
          </DialogTitle>
          <DialogDescription>
            Upload a photo to verify you still have possession of {itemName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Photo Upload */}
          <div className="space-y-3">
            <Label>Verification Photo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {photoPreview ? (
              <div className="relative">
                <img 
                  src={photoPreview} 
                  alt="Verification preview" 
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change Photo
                </Button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  Take or upload a photo of your item
                </p>
                <Button variant="secondary" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Any additional notes about the item's condition..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Guidelines */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
            <p className="font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Photo Guidelines
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Show the item clearly with good lighting</li>
              <li>Include today's date if possible (newspaper, screen)</li>
              <li>Show any protective case or storage</li>
              <li>Take a new photo each day - no reusing old photos</li>
            </ul>
          </div>

          {/* Last Verification */}
          {lastVerifiedAt && (
            <div className={`p-3 rounded-lg ${isOverdue ? 'bg-destructive/10' : 'bg-primary/10'}`}>
              <p className="text-sm">
                <span className="font-medium">Last verified: </span>
                {new Date(lastVerifiedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={loading || !photoFile} className="flex-1">
            {loading ? "Submitting..." : "Submit Verification"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
