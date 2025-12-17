import { useState, useRef, useEffect } from 'react';
import { Edit2, Camera, Save, X, Shield, ShieldCheck, Upload, Crown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { XPProgressBar } from '@/components/XPProgressBar';
import { ProfileBadges } from './ProfileBadges';
import { ProfileBackgroundSelector } from './ProfileBackgroundSelector';
import { ProfileGuruSelector } from './ProfileGuruSelector';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { ProBadge } from '@/components/subscription/ProBadge';
import { SubscriptionUpgradeDialog } from '@/components/subscription/SubscriptionUpgradeDialog';

interface ProfileHeaderProps {
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    xp: number;
    level: number;
    profile_background: string;
    is_beta_tester: boolean;
    badges: string[];
    title: string | null;
    referral_code: string | null;
    created_at: string;
    is_id_verified?: boolean;
    guru_expertise?: string[];
    custom_guru?: string | null;
  };
  backgrounds: any[];
  unlockedBackgrounds: string[];
  isOwnProfile: boolean;
  onUpdate: (updates: any) => Promise<boolean>;
  onUnlockBackground: (id: string, cost: number) => Promise<boolean>;
}

export const ProfileHeader = ({
  profile,
  backgrounds,
  unlockedBackgrounds,
  isOwnProfile,
  onUpdate,
  onUnlockBackground
}: ProfileHeaderProps) => {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    display_name: profile.display_name || '',
    bio: profile.bio || '',
    title: profile.title || ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idFileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAvatar, uploading } = useAvatarUpload();
  const { t } = useLanguage();
  const { isPro, subscription, refetch: refetchSubscription } = useSubscription(profile.id);

  const selectedBackground = backgrounds.find(b => b.id === profile.profile_background);
  const backgroundStyle = selectedBackground?.css_value || 'hsl(240, 10%, 4%)';
  const isAnimated = selectedBackground?.type === 'animated';

  const handleSave = async () => {
    const success = await onUpdate(editData);
    if (success) {
      setEditing(false);
    }
  };

  const handleBackgroundSelect = async (backgroundId: string) => {
    await onUpdate({ profile_background: backgroundId });
  };

  const handleAvatarClick = () => {
    if (isOwnProfile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newUrl = await uploadAvatar(file);
      if (newUrl) {
        await onUpdate({ avatar_url: newUrl });
      }
    }
  };

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newUrl = await uploadAvatar(file);
      if (newUrl) {
        await onUpdate({ id_document_url: newUrl });
      }
    }
  };

  const handleGuruUpdate = async (expertise: string[], customGuru: string | null) => {
    await onUpdate({ guru_expertise: expertise, custom_guru: customGuru });
  };

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={idFileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleIdUpload}
      />

      {/* Background */}
      <div
        className="h-48 md:h-64"
        style={{
          background: backgroundStyle,
          backgroundSize: isAnimated ? '400% 400%' : undefined,
          animation: isAnimated ? 'gradient-shift 8s ease infinite' : undefined
        }}
      />

      {/* Content */}
      <div className="relative bg-card border border-border rounded-b-xl -mt-20 mx-4 md:mx-8 p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="relative -mt-16 md:-mt-20">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background ring-4 ring-card">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl md:text-4xl bg-gradient-to-br from-primary to-primary/60">
                {profile.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                onClick={handleAvatarClick}
                disabled={uploading}
              >
                <Camera className={`h-4 w-4 ${uploading ? 'animate-pulse' : ''}`} />
              </Button>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                {editing ? (
                  <div className="space-y-2">
                    <Input
                      value={editData.display_name}
                      onChange={(e) => setEditData({ ...editData, display_name: e.target.value })}
                      placeholder="Display Name"
                      className="text-xl font-bold"
                    />
                    <Input
                      value={editData.title}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      placeholder="Custom Title (e.g. Legendary Collector)"
                      className="text-sm"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                        {profile.display_name || 'Anonymous'}
                      </h1>
                      {isPro && <ProBadge />}
                      {profile.is_id_verified && (
                        <Badge variant="secondary" className="gap-1 bg-primary/20 text-primary">
                          <ShieldCheck className="h-3 w-3" />
                          {t.profile.verified}
                        </Badge>
                      )}
                    </div>
                    {profile.title && (
                      <p className="text-sm text-muted-foreground italic">{profile.title}</p>
                    )}
                  </>
                )}
                
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-sm text-muted-foreground">
                    {t.profile.memberSince} {memberSince}
                  </p>
                  <Badge variant="outline" className="gap-1">
                    {t.profile.level}: {profile.level}
                  </Badge>
                </div>

                {/* Guru Expertise Tags */}
                {(profile.guru_expertise?.length > 0 || profile.custom_guru) && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.guru_expertise?.map((guru) => (
                      <Badge key={guru} variant="secondary" className="bg-primary/20 text-primary">
                        {t.profile.expertiseCategories[guru as keyof typeof t.profile.expertiseCategories] || guru}
                      </Badge>
                    ))}
                    {profile.custom_guru && (
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                        {profile.custom_guru}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {isOwnProfile && (
                <div className="flex flex-wrap gap-2">
                  {editing ? (
                    <>
                      <Button size="sm" onClick={handleSave} className="gap-2">
                        <Save className="h-4 w-4" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {!isPro && (
                        <SubscriptionUpgradeDialog 
                          userId={profile.id} 
                          onSuccess={refetchSubscription}
                        >
                          <Button 
                            size="sm" 
                            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                          >
                            <Crown className="h-4 w-4" />
                            Upgrade to Pro
                          </Button>
                        </SubscriptionUpgradeDialog>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-2">
                        <Edit2 className="h-4 w-4" />
                        Edit Profile
                      </Button>
                      <ProfileBackgroundSelector
                        backgrounds={backgrounds}
                        unlockedBackgrounds={unlockedBackgrounds}
                        currentBackground={profile.profile_background}
                        userLevel={profile.level}
                        userXP={profile.xp}
                        onSelect={handleBackgroundSelect}
                        onUnlock={onUnlockBackground}
                      />
                      <ProfileGuruSelector
                        currentExpertise={profile.guru_expertise || []}
                        customGuru={profile.custom_guru || ''}
                        onUpdate={handleGuruUpdate}
                      />
                      {!profile.is_id_verified && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-2"
                          onClick={() => idFileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4" />
                          {t.profile.uploadId}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Bio */}
            {editing ? (
              <Textarea
                value={editData.bio}
                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                placeholder="Tell us about yourself and your collection..."
                rows={3}
              />
            ) : profile.bio ? (
              <p className="text-muted-foreground">{profile.bio}</p>
            ) : null}

            {/* Badges */}
            <ProfileBadges
              badges={profile.badges}
              isBetaTester={profile.is_beta_tester}
              level={profile.level}
            />

            {/* XP Progress */}
            <XPProgressBar xp={profile.xp} compact />
          </div>
        </div>
      </div>
    </div>
  );
};