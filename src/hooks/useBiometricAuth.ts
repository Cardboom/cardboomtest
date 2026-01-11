import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface BiometricResult {
  isAvailable: boolean;
  biometryType: 'fingerprint' | 'face' | 'iris' | 'none';
}

export const useBiometricAuth = () => {
  const [biometricResult, setBiometricResult] = useState<BiometricResult>({
    isAvailable: false,
    biometryType: 'none',
  });
  const [loading, setLoading] = useState(true);

  const isNativePlatform = Capacitor.isNativePlatform();

  useEffect(() => {
    const checkBiometrics = async () => {
      if (!isNativePlatform) {
        setBiometricResult({ isAvailable: false, biometryType: 'none' });
        setLoading(false);
        return;
      }

      try {
        // Check if we're on a native platform with biometric support
        // This would require @capacitor-community/biometric-auth plugin
        // For now, we'll check if we're on native and assume it's available
        const isIOS = Capacitor.getPlatform() === 'ios';
        const isAndroid = Capacitor.getPlatform() === 'android';

        if (isIOS || isAndroid) {
          // In a real implementation, you'd use:
          // import { NativeBiometric } from '@capawesome-team/capacitor-biometric-auth';
          // const result = await NativeBiometric.isAvailable();
          setBiometricResult({
            isAvailable: true,
            biometryType: isIOS ? 'face' : 'fingerprint',
          });
        }
      } catch (error) {
        console.log('Biometrics not available:', error);
        setBiometricResult({ isAvailable: false, biometryType: 'none' });
      }
      setLoading(false);
    };

    checkBiometrics();
  }, [isNativePlatform]);

  const authenticateWithBiometrics = async (): Promise<boolean> => {
    if (!biometricResult.isAvailable) {
      return false;
    }

    try {
      // In a real implementation:
      // const result = await NativeBiometric.verifyIdentity({
      //   title: 'Sign in to CardBoom',
      //   subtitle: 'Use biometrics to sign in',
      // });
      // return result.success;
      
      // For now, simulate success on native
      return isNativePlatform;
    } catch (error) {
      console.error('Biometric auth failed:', error);
      return false;
    }
  };

  const saveBiometricCredentials = async (email: string, sessionToken: string): Promise<boolean> => {
    if (!biometricResult.isAvailable) {
      return false;
    }

    try {
      // In a real implementation:
      // await NativeBiometric.setCredentials({
      //   username: email,
      //   password: sessionToken,
      //   server: 'cardboom.app',
      // });
      
      // For now, just store a flag
      localStorage.setItem('biometric_enabled', 'true');
      localStorage.setItem('biometric_email', email);
      return true;
    } catch (error) {
      console.error('Failed to save biometric credentials:', error);
      return false;
    }
  };

  const getBiometricCredentials = async (): Promise<{ email: string; token: string } | null> => {
    if (!biometricResult.isAvailable) {
      return null;
    }

    try {
      const enabled = localStorage.getItem('biometric_enabled') === 'true';
      const email = localStorage.getItem('biometric_email');
      
      if (!enabled || !email) {
        return null;
      }

      // In a real implementation, you'd get the actual token:
      // const credentials = await NativeBiometric.getCredentials({
      //   server: 'cardboom.app',
      // });
      
      return { email, token: '' };
    } catch (error) {
      return null;
    }
  };

  const clearBiometricCredentials = async () => {
    localStorage.removeItem('biometric_enabled');
    localStorage.removeItem('biometric_email');
  };

  return {
    isAvailable: biometricResult.isAvailable,
    biometryType: biometricResult.biometryType,
    loading,
    isNativePlatform,
    authenticateWithBiometrics,
    saveBiometricCredentials,
    getBiometricCredentials,
    clearBiometricCredentials,
  };
};
