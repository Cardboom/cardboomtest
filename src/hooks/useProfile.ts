import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfileBackground {
  id: string;
  name: string;
  type: string;
  css_value: string;
  unlock_level: number;
  xp_cost: number;
  is_premium: boolean;
}

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  email: string | null;
  xp: number;
  level: number;
  profile_background: string;
  is_beta_tester: boolean;
  badges: string[];
  title: string | null;
  showcase_items: string[];
  referral_code: string | null;
  created_at: string;
  is_id_verified: boolean;
  id_document_url: string | null;
  guru_expertise: string[];
  custom_guru: string | null;
  show_collection_count: boolean;
  show_portfolio_value: boolean;
  featured_card_id: string | null;
  profile_color_primary: string | null;
  profile_color_secondary: string | null;
  last_login_at: string | null;
}

export const useProfile = (userId?: string) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [backgrounds, setBackgrounds] = useState<ProfileBackground[]>([]);
  const [unlockedBackgrounds, setUnlockedBackgrounds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async () => {
    try {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) throw error;

      setProfile({
        id: profileData.id,
        display_name: profileData.display_name,
        avatar_url: profileData.avatar_url,
        bio: profileData.bio,
        email: profileData.email,
        xp: profileData.xp || 0,
        level: profileData.level || 1,
        profile_background: profileData.profile_background || 'default',
        is_beta_tester: profileData.is_beta_tester || false,
        badges: (profileData.badges as string[]) || [],
        title: profileData.title,
        showcase_items: (profileData.showcase_items as string[]) || [],
        referral_code: profileData.referral_code,
        created_at: profileData.created_at,
        is_id_verified: profileData.is_id_verified || false,
        id_document_url: profileData.id_document_url,
        guru_expertise: (profileData.guru_expertise as string[]) || [],
        custom_guru: profileData.custom_guru,
        show_collection_count: profileData.show_collection_count ?? true,
        show_portfolio_value: profileData.show_portfolio_value ?? false,
        featured_card_id: profileData.featured_card_id,
        profile_color_primary: profileData.profile_color_primary,
        profile_color_secondary: profileData.profile_color_secondary,
        last_login_at: profileData.last_login_at,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBackgrounds = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_backgrounds')
        .select('*')
        .order('unlock_level', { ascending: true });

      if (error) throw error;
      setBackgrounds(data || []);
    } catch (error) {
      console.error('Error fetching backgrounds:', error);
    }
  };

  const fetchUnlockedBackgrounds = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_unlocked_backgrounds')
        .select('background_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setUnlockedBackgrounds(data?.map(b => b.background_id) || []);
    } catch (error) {
      console.error('Error fetching unlocked backgrounds:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: updates.display_name,
          bio: updates.bio,
          avatar_url: updates.avatar_url,
          title: updates.title,
          profile_background: updates.profile_background,
          showcase_items: updates.showcase_items,
          id_document_url: updates.id_document_url,
          guru_expertise: updates.guru_expertise,
          custom_guru: updates.custom_guru,
          show_collection_count: updates.show_collection_count,
          show_portfolio_value: updates.show_portfolio_value,
          featured_card_id: updates.featured_card_id,
          profile_color_primary: updates.profile_color_primary,
          profile_color_secondary: updates.profile_color_secondary,
        })
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile();
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been saved successfully.',
      });
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile.',
        variant: 'destructive'
      });
      return false;
    }
  };

  const unlockBackground = async (backgroundId: string, xpCost: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if user has enough XP
      if (!profile || profile.xp < xpCost) {
        toast({
          title: 'Not Enough XP',
          description: `You need ${xpCost} XP to unlock this background.`,
          variant: 'destructive'
        });
        return false;
      }

      // Deduct XP and add unlock record
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ xp: profile.xp - xpCost })
        .eq('id', user.id);

      if (updateError) throw updateError;

      const { error: unlockError } = await supabase
        .from('user_unlocked_backgrounds')
        .insert([{ user_id: user.id, background_id: backgroundId }]);

      if (unlockError) throw unlockError;

      await fetchProfile();
      await fetchUnlockedBackgrounds();

      toast({
        title: 'Background Unlocked!',
        description: 'You can now use this background on your profile.',
      });
      return true;
    } catch (error) {
      console.error('Error unlocking background:', error);
      toast({
        title: 'Error',
        description: 'Failed to unlock background.',
        variant: 'destructive'
      });
      return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchProfile();
      await fetchBackgrounds();
      await fetchUnlockedBackgrounds();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    profile,
    backgrounds,
    unlockedBackgrounds,
    loading,
    updateProfile,
    unlockBackground,
    refetch: fetchProfile
  };
};
