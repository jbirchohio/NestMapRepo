import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SOURCE_SPLASH = path.join(__dirname, '../resources/splash-template.svg');
const OUTPUT_DIR = path.join(__dirname, '../resources');
// Android splash screen sizes (portrait)
const ANDROID_SPLASH_SCREENS = [
    { width: 1080, height: 1920, name: 'android/splash/drawable-port-xxxhdpi-screen.png' },
    { width: 720, height: 1280, name: 'android/splash/drawable-port-xxhdpi-screen.png' },
    { width: 480, height: 800, name: 'android/splash/drawable-port-hdpi-screen.png' },
    { width: 320, height: 480, name: 'android/splash/drawable-port-mdpi-screen.png' },
];
// iOS splash screen sizes
const IOS_SPLASH_SCREENS = [
    // iPhone
    { width: 1179, height: 2556, name: 'ios/splash/Default-1179h@3x~iphone.png' }, // iPhone 15 Pro Max
    { width: 1170, height: 2532, name: 'ios/splash/Default-1170h@3x~iphone.png' }, // iPhone 14 Pro
    { width: 1125, height: 2436, name: 'ios/splash/Default-1125h@3x~iphone.png' }, // iPhone X/XS
    { width: 1242, height: 2688, name: 'ios/splash/Default-1242h@3x~iphone.png' }, // iPhone XS Max
    { width: 828, height: 1792, name: 'ios/splash/Default-828h@2x~iphone.png' }, // iPhone XR
    { width: 750, height: 1334, name: 'ios/splash/Default-750h@2x~iphone.png' }, // iPhone 8/7/6s/6
    { width: 640, height: 1136, name: 'ios/splash/Default-568h@2x~iphone.png' }, // iPhone 5
    // iPad
    { width: 2048, height: 2732, name: 'ios/splash/Default-2048w@2x~ipad.png' }, // iPad Pro 12.9"
    { width: 1668, height: 2224, name: 'ios/splash/Default-1668w@2x~ipad.png' }, // iPad Pro 10.5"
    { width: 1536, height: 2048, name: 'ios/splash/Default-1536w@2x~ipad.png' }, // iPad Air/Pro 9.7"
];
async function generateSplashScreens() {
    console.log('Generating splash screens...');
    try {
        // Create output directories if they don't exist
        if (!fs.existsSync(path.join(OUTPUT_DIR, 'android/splash'))) {
            fs.mkdirSync(path.join(OUTPUT_DIR, 'android/splash'), { recursive: true });
        }
        if (!fs.existsSync(path.join(OUTPUT_DIR, 'ios/splash'))) {
            fs.mkdirSync(path.join(OUTPUT_DIR, 'ios/splash'), { recursive: true });
        }
        // Generate Android splash screens
        for (const screen of ANDROID_SPLASH_SCREENS) {
            await sharp(SOURCE_SPLASH)
                .resize(screen.width, screen.height)
                .png()
                .toFile(path.join(OUTPUT_DIR, screen.name));
            console.log(`Generated ${screen.name}`);
        }
        // Generate iOS splash screens
        for (const screen of IOS_SPLASH_SCREENS) {
            await sharp(SOURCE_SPLASH)
                .resize(screen.width, screen.height)
                .png()
                .toFile(path.join(OUTPUT_DIR, screen.name));
            console.log(`Generated ${screen.name}`);
        }
        console.log('Splash screen generation complete!');
    }
    catch (error) {
        console.error('Error generating splash screens:', error);
    }
}
generateSplashScreens();
