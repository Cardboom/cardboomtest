import { useState } from 'react';
import { Edit2, Camera, Save, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { XPProgressBar } from '@/components/XPProgressBar';
import { ProfileBadges } from './ProfileBadges';
import { ProfileBackgroundSelector } from './ProfileBackgroundSelector';

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

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="relative rounded-xl overflow-hidden">
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
              >
                <Camera className="h-4 w-4" />
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
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                      {profile.display_name || 'Anonymous'}
                    </h1>
                    {profile.title && (
                      <p className="text-sm text-muted-foreground italic">{profile.title}</p>
                    )}
                  </>
                )}
                
                <p className="text-sm text-muted-foreground mt-1">
                  Member since {memberSince}
                </p>
              </div>

              {isOwnProfile && (
                <div className="flex gap-2">
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
