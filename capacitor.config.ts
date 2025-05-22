import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nestmap.app',
  appName: 'NestMap',
  webDir: 'dist',
  server: {
    // During development, you can use this for local testing
    // url: 'http://localhost:5000',
    // For production, use your hosted URL when ready to deploy
    // url: 'https://nestmap.vercel.app',
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    buildOptions: {
      keystorePath: 'android.keystore',
      keystoreAlias: 'nestmap',
    }
  },
  ios: {
    scheme: 'NestMap',
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