import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cardboom.app',
  appName: 'CardBoom',
  webDir: 'dist',
  server: {
    // Enable for hot-reload during development:
    // url: 'https://b56128be-ee17-48af-baa7-915f88c0900b.lovableproject.com?forceHideBadge=true',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0f1a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0a0f1a'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  ios: {
    scheme: 'CardBoom',
    contentInset: 'automatic'
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0a0f1a',
    buildOptions: {
      keystorePath: 'android/release.keystore',
      keystoreAlias: 'cardboom'
    }
  }
};

export default config;
