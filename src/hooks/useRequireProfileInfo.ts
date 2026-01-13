import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileInfo {
  phone: string | null;
  national_id: string | null;
  email: string | null;
}

export const useRequireProfileInfo = () => {
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [needsProfileInfo, setNeedsProfileInfo] = useState(false);

  const checkProfileInfo = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user signed in via OAuth (Google, etc.)
      // OAuth users have app_metadata.provider set to the OAuth provider
      const provider = user.app_metadata?.provider;
      const isOAuth = provider && provider !== 'email' && provider !== 'phone';
      setIsOAuthUser(isOAuth);

      // Fetch profile data
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('phone, national_id, email')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(profileData);

      // Check if OAuth user is missing phone or national ID
      if (isOAuth) {
        const missingPhone = !profileData?.phone || profileData.phone.trim() === '';
        const missingNationalId = !profileData?.national_id || profileData.national_id.trim() === '';
        setNeedsProfileInfo(missingPhone || missingNationalId);
      } else {
        setNeedsProfileInfo(false);
      }
    } catch (error) {
      console.error('Error checking profile info:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkProfileInfo();
  }, [checkProfileInfo]);

  return {
    profile,
    loading,
    isOAuthUser,
    needsProfileInfo,
    refetch: checkProfileInfo
  };
};
