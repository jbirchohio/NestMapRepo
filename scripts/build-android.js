import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Run shell command as a promise
 */
const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        console.log(`Running: ${command}`);
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return reject(error);
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
            }
            console.log(`stdout: ${stdout}`);
            resolve(stdout);
        });
    });
};
/**
 * Build Android APK using Gradle
 */
async function buildAndroidApk() {
    try {
        console.log('Building Android APK...');
        // Check if Android directory exists
        if (!fs.existsSync('android')) {
            console.error('Android platform not found. Please run prepare-mobile.js first.');
            process.exit(1);
        }
        // Make sure we have the latest web build
        await runCommand('npm run build');
        await runCommand('npx cap sync android');
        // Check if we're on a system with ./gradlew access
        const hasGradlew = fs.existsSync('android/gradlew');
        if (hasGradlew) {
            // Direct gradlew build (works on Linux/Mac)
            console.log('Building using gradlew...');
            process.chdir('android');
            await runCommand('./gradlew assembleRelease');
            process.chdir('..');
            console.log('\n===== ANDROID BUILD COMPLETE =====');
            console.log('Your APK is available at:');
            console.log('android/app/build/outputs/apk/release/app-release-unsigned.apk');
            console.log('\nTo sign the APK, follow these steps:');
            console.log('1. Generate a signing key if you don\'t have one:');
            console.log('   keytool -genkey -v -keystore nestmap-release-key.keystore -alias nestmap -keyalg RSA -keysize 2048 -validity 10000');
            console.log('2. Sign the APK:');
            console.log('   jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore nestmap-release-key.keystore android/app/build/outputs/apk/release/app-release-unsigned.apk nestmap');
            console.log('3. Optimize the APK:');
            console.log('   zipalign -v 4 android/app/build/outputs/apk/release/app-release-unsigned.apk nestmap-release.apk');
        }
        else {
            // Instructions for manual build
            console.log('\n===== ANDROID BUILD INSTRUCTIONS =====');
            console.log('To complete the Android build:');
            console.log('1. Open Android Studio:');
            console.log('   npx cap open android');
            console.log('2. Select "Build > Generate Signed Bundle/APK"');
            console.log('3. Follow the dialog to create or select your keystore');
            console.log('4. Select "APK" and choose "release" build variant');
            console.log('5. Click "Finish" to build the APK');
            console.log('\nSee MOBILE_BUILD_GUIDE.md for more detailed instructions.');
        }
    }
    catch (error) {
        console.error('Error building Android APK:', error);
        process.exit(1);
    }
}
buildAndroidApk();
