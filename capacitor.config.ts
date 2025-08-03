import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.voyageops.app',
  appName: 'VoyageOps',
  webDir: 'dist',
  server: {
    // Production URL - update this to your custom domain for enterprise deployment
    url: process.env.CAPACITOR_SERVER_URL || 'https://your-domain.com',
    androidScheme: 'https',
    cleartext: false // Disable cleartext for production security
  },
  android: {
    buildOptions: {
      keystorePath: 'android.keystore',
      keystoreAlias: 'voyageops',
    }
  },
  ios: {
    scheme: 'VoyageOps',
    limitsNavigationsToAppBoundDomains: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      spinnerColor: "#4374CB",
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;