# NestMap Mobile Build Guide

This guide provides detailed instructions for building and submitting the NestMap app to the Apple App Store and Google Play Store.

## Prerequisites

- **Apple Developer Account** ($99/year) for iOS App Store submission
- **Google Play Developer Account** ($25 one-time fee) for Android submission
- **Xcode** installed on a Mac for iOS builds
- **Android Studio** installed for Android builds
- **Production URL** where your NestMap web app is hosted

## Initial Setup

1. Make sure you've completed the preparation steps:
   ```
   node scripts/prepare-mobile.js
   ```

2. Update your production URL in the script before running:
   ```javascript
   // In scripts/prepare-mobile.js
   const PROD_URL = 'https://your-nestmap-app.com'; // Replace with your actual URL
   ```

## Building for Android

### 1. Open the Android Project

```bash
npx cap open android
```

This will open the project in Android Studio.

### 2. Configure App Settings

1. In Android Studio, open `android/app/src/main/AndroidManifest.xml`
2. Verify the package name is `com.nestmap.app` (or your custom package name)
3. Update the app name if needed

### 3. Generate Signing Key

If you don't have a keystore for signing your app:

1. In Android Studio, go to `Build > Generate Signed Bundle/APK`
2. Select `Android App Bundle` or `APK` based on your preference
3. Click `Create new...` to create a new keystore
4. Fill in the required information:
   - Keystore path: `nestmap.keystore` (store this securely!)
   - Password: Create a strong password
   - Key alias: `nestmap`
   - Key password: Create a strong password
   - Validity: 25+ years recommended
   - Certificate information: Your organization details

**IMPORTANT**: Save your keystore file and passwords securely. If lost, you won't be able to update your app in the future.

### 4. Build the App Bundle/APK

#### For App Bundle (Recommended for Play Store):

1. Go to `Build > Generate Signed Bundle/APK`
2. Select `Android App Bundle`
3. Select your keystore and enter passwords
4. Select `release` build variant
5. Click `Finish`

The .aab file will be generated in `android/app/release/app-release.aab`

#### For APK:

1. Go to `Build > Generate Signed Bundle/APK`
2. Select `APK`
3. Select your keystore and enter passwords
4. Select `release` build variant
5. Click `Finish`

The .apk file will be generated in `android/app/release/app-release.apk`

### 5. Testing the Android Build

1. Install the APK on your device:
   ```bash
   adb install android/app/release/app-release.apk
   ```

2. Test all app functionality to ensure it works properly

## Building for iOS

### 1. Open the iOS Project

```bash
npx cap open ios
```

This will open the project in Xcode.

### 2. Configure App Settings

1. In Xcode, click on the project root in the left sidebar
2. Select the `NestMap` target
3. Under the `General` tab:
   - Verify Bundle Identifier is `com.nestmap.app` (or your custom ID)
   - Update the Version and Build numbers
   - Ensure Deployment Info is set correctly (iOS 13.0+ recommended)

### 3. Set up Signing and Capabilities

1. In the `Signing & Capabilities` tab:
   - Select your Team (Apple Developer account)
   - Ensure `Automatically manage signing` is checked
   - Xcode will generate a provisioning profile

2. If you're using specific capabilities (push notifications, etc.), add them here

### 4. Configure App Icons

1. In the left sidebar, navigate to `App > Assets.xcassets > AppIcon`
2. Add your app icons in the required sizes
   - You can use the icons generated in `public/assets/icon`
   - For best results, create properly sized icons for all required dimensions

### 5. Build the App for Archive

1. Select the appropriate device/simulator in the top toolbar (Generic iOS Device for archiving)
2. Go to `Product > Archive`
3. Wait for the build to complete and the Archives window to appear

### 6. Export the Archive

1. In the Archives window, select your recent archive
2. Click `Distribute App`
3. Select `App Store Connect` and click `Next`
4. Choose `Upload` to upload directly to App Store Connect
5. Follow the prompts to complete the process
6. Alternatively, export for `Ad Hoc` or `Development` distribution for testing

## App Store Submission Materials

### Common Requirements for Both Stores

1. **App Name**: "NestMap" or your preferred name
2. **App Description**: Write a compelling description highlighting key features:
   ```
   NestMap is an AI-powered travel planning platform that makes trip preparation simple and enjoyable. Build interactive, map-based itineraries, discover hidden gems with intelligent recommendations, and collaborate with travel companions all in one beautifully designed app.

   Key features:
   • Interactive map-based planning
   • AI travel recommendations
   • Weather-aware scheduling
   • Collaborative trip building
   • Budget tracking and optimization
   • Offline access to your itineraries
   ```

3. **Screenshots**: Create 3-5 screenshots for each device type:
   - iPhone: 6.5" and 5.5" displays
   - iPad Pro
   - Android: Phone and Tablet

4. **Privacy Policy URL**: Required for both stores

### Apple App Store Specific

1. **App Review Information**:
   - Contact information
   - Demo account credentials (if login required)
   - Notes for reviewers explaining how to test key functionality

2. **App Store Icon**: 1024×1024px PNG without transparency

3. **App Store Categories**: 
   - Primary: Travel
   - Secondary: Productivity or Lifestyle

### Google Play Store Specific

1. **Feature Graphic**: 1024×500px JPG or PNG
   
2. **Content Rating**: Complete the questionnaire

3. **Target Audience**: Select age ranges

4. **Store Listing Categories**:
   - Application Type: Applications
   - Category: Travel & Local
   - Tags: Select relevant tags like "travel planning" or "maps"

## Troubleshooting Common Issues

### Android Build Issues

1. **Gradle Sync Failures**:
   - Check that Android Studio is up to date
   - Update Gradle plugin if needed
   - Ensure Java version is compatible

2. **Manifest Merger Issues**:
   - Check for conflicts in AndroidManifest.xml
   - Review Capacitor plugin requirements

### iOS Build Issues

1. **Signing Certificate Problems**:
   - Verify Apple Developer account is active
   - Try refreshing certificates in Xcode
   - Check Keychain Access for valid certificates

2. **App Transport Security**:
   - Ensure your production URL supports HTTPS
   - Add necessary ATS exceptions in Info.plist if needed

## Advanced Configuration

### Deep Linking

To enable deep linking to specific screens in your app:

1. **Android**:
   Edit `android/app/src/main/AndroidManifest.xml` to add intent filters

2. **iOS**:
   Configure Universal Links in Xcode project settings

### Push Notifications

To add push notification support:

1. Install the Capacitor Push Notifications plugin:
   ```bash
   npm install @capacitor/push-notifications
   npx cap sync
   ```

2. Follow platform-specific setup for Firebase Cloud Messaging (Android) and Apple Push Notification Service (iOS)

## Updating Your App

When you need to update your app:

1. Make changes to your web app
2. Update version numbers in package.json
3. Run the preparation script again:
   ```bash
   node scripts/prepare-mobile.js
   ```
4. Build new versions using the same process above
5. Submit updates to the respective app stores

## Submission Checklist

Before submitting to app stores, verify:

- [ ] App icon and splash screen display correctly
- [ ] All app features work properly on mobile
- [ ] App handles poor network conditions gracefully
- [ ] Login/authentication works correctly
- [ ] Deep links function as expected (if implemented)
- [ ] App meets accessibility guidelines
- [ ] Privacy policy is up to date and accessible
- [ ] Version numbers are properly incremented from previous releases