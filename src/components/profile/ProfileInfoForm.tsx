import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { PhoneInputWithCountry } from '@/components/ui/phone-input';

interface ProfileInfoFormProps {
  userId: string;
}

export const ProfileInfoForm = ({ userId }: ProfileInfoFormProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const [originalData, setOriginalData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    nationalId: '',
    displayName: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, national_id, display_name')
        .eq('id', userId)
        .single() as { data: { first_name: string | null; last_name: string | null; phone: string | null; national_id: string | null; display_name: string | null } | null; error: any };

      if (error) {
        console.error('Error loading profile:', error);
        setLoading(false);
        return;
      }

      if (profile) {
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
        setPhone(profile.phone || '');
        setNationalId(profile.national_id || '');
        setDisplayName(profile.display_name || '');
        
        setOriginalData({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          phone: profile.phone || '',
          nationalId: profile.national_id || '',
          displayName: profile.display_name || '',
        });
      }
      setLoading(false);
    };

    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const hasChanges = 
    firstName !== originalData.firstName ||
    lastName !== originalData.lastName ||
    phone !== originalData.phone ||
    nationalId !== originalData.nationalId ||
    displayName !== originalData.displayName;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }

    setSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        national_id: nationalId.trim() || null,
        display_name: displayName.trim() || `${firstName.trim()} ${lastName.trim().charAt(0)}.`,
      })
      .eq('id', userId);

    if (error) {
      toast.error('Failed to save profile: ' + error.message);
    } else {
      toast.success('Profile updated successfully');
      setOriginalData({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        nationalId: nationalId.trim(),
        displayName: displayName.trim() || `${firstName.trim()} ${lastName.trim().charAt(0)}.`,
      });
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Personal Information
        </CardTitle>
        <CardDescription>
          Update your personal details. Phone and National ID are required for wallet top-ups and verified seller status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name *</Label>
              <Input
                id="first-name"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name *</Label>
              <Input
                id="last-name"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              type="text"
              placeholder="How you appear to others"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This is how other users will see you. Leave blank to use your first name.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
              {phone && (
                <span className="text-xs text-gain flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              )}
            </Label>
            <PhoneInputWithCountry
              value={phone}
              onChange={(fullNumber) => setPhone(fullNumber)}
              placeholder="Phone number with country code"
            />
            <p className="text-xs text-muted-foreground">
              Required for account security and wallet verification.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="national-id">National ID / Passport</Label>
            <Input
              id="national-id"
              type="text"
              placeholder="Enter your ID number"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 20))}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              Required for verified seller status and financial compliance. 5-20 alphanumeric characters.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={saving || !hasChanges}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
            {!hasChanges && (
              <span className="text-sm text-muted-foreground">No changes to save</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
