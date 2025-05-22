# NestMap Mobile App Deployment

This guide explains how to convert your NestMap web application into native mobile apps for iOS and Android app stores.

## Prerequisites

Before proceeding, ensure you have:
- Hosted your NestMap app on a production URL (Vercel, Render, etc.)
- Installed the required Capacitor packages (already done in this project)
- Access to a Mac for iOS builds (required for App Store submission)
- Android Studio installed for Android builds
- Xcode installed for iOS builds (Mac only)

## Quick Start Commands

Run these commands to prepare and build your mobile apps:

```bash
# Step 1: Generate app icons
node scripts/generate-icons.js

# Step 2: Prepare the app for mobile platforms
# Make sure to edit the PROD_URL in scripts/prepare-mobile.js first!
node scripts/prepare-mobile.js

# Step 3: Build Android app
node scripts/build-android.js

# Step 4: Prepare iOS app (Mac only)
node scripts/build-ios.js
```

## Setting Your Production URL

Before building your mobile apps, edit `scripts/prepare-mobile.js` to set your production URL:

```javascript
// In scripts/prepare-mobile.js
const PROD_URL = 'https://your-nestmap-app.com'; // Replace with your actual URL
```

This URL should be the production deployment of your NestMap app.

## Building for Android

After running the preparation script, you have two options:

### Option 1: Using Android Studio (Recommended)

1. Open Android Studio with:
   ```bash
   npx cap open android
   ```

2. In Android Studio, go to `Build > Generate Signed Bundle/APK`
3. Choose `Android App Bundle` for Play Store or `APK` for direct distribution
4. Follow the instructions to create or use an existing keystore
5. The built file will be in `android/app/release/`

### Option 2: Command Line (Advanced)

If you have the Android SDK and tools installed:

1. Run the Android build script:
   ```bash
   node scripts/build-android.js
   ```

2. Follow the on-screen instructions to sign your APK

## Building for iOS (Mac Only)

iOS builds require a Mac with Xcode installed:

1. Run the iOS preparation script:
   ```bash
   node scripts/build-ios.js
   ```

2. Open Xcode:
   ```bash
   npx cap open ios
   ```

3. In Xcode:
   - Set up app signing with your Apple Developer account
   - Choose `Product > Archive` to create an app archive
   - Use the Archives window to distribute to App Store or TestFlight

## App Store Submission Requirements

Before submitting to app stores, prepare:

- App store screenshots (3-5 for each device type)
- App icon (already generated)
- App description and metadata
- Privacy policy URL

See the comprehensive `MOBILE_BUILD_GUIDE.md` for detailed submission instructions.

## Troubleshooting

If you encounter issues:

- **Android build fails**: Check Android Studio and Gradle versions
- **iOS build fails**: Verify Apple Developer account and certificate setup
- **App doesn't load**: Verify your production URL is accessible and working
- **White screen**: Check web app compatibility with Capacitor

## Updating Your Mobile App

When you update your web app, follow these steps to update mobile apps:

1. Update your web app and deploy to production
2. Run `node scripts/prepare-mobile.js` again
3. Follow the build steps for Android and iOS
4. Submit updated versions to respective app stores

For more detailed instructions, refer to `MOBILE_BUILD_GUIDE.md`.