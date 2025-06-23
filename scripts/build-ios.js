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
 * Prepare iOS build for App Store submission
 */
async function prepareiOSBuild() {
    try {
        console.log('Preparing iOS build for App Store submission...');
        // Check if iOS directory exists
        if (!fs.existsSync('ios')) {
            console.error('iOS platform not found. Please run prepare-mobile.js first.');
            process.exit(1);
        }
        // Make sure we have the latest web build
        await runCommand('npm run build');
        await runCommand('npx cap sync ios');
        // Check if we're on macOS (required for iOS builds)
        const isMac = process.platform === 'darwin';
        if (!isMac) {
            console.log('\n⚠️ WARNING: iOS builds require macOS');
            console.log('You appear to be running on a different operating system.');
        }
        console.log('\n===== iOS BUILD INSTRUCTIONS =====');
        console.log('To complete the iOS build:');
        console.log('1. Open Xcode:');
        console.log('   npx cap open ios');
        console.log('2. Configure signing in Xcode:');
        console.log('   - Select the project in the Navigator');
        console.log('   - Select the "NestMap" target');
        console.log('   - Go to the "Signing & Capabilities" tab');
        console.log('   - Select your team and ensure signing is set up properly');
        console.log('3. Build for archiving:');
        console.log('   - Select "Generic iOS Device" from the device selector');
        console.log('   - Select "Product > Archive" from the menu');
        console.log('4. In the Archives window:');
        console.log('   - Select "Distribute App"');
        console.log('   - Choose the appropriate distribution method:');
        console.log('     * "App Store Connect" for App Store submission');
        console.log('     * "Ad Hoc" for TestFlight or internal testing');
        console.log('     * "Development" for development testing');
        console.log('   - Follow the prompts to complete the export');
        console.log('\nSee MOBILE_BUILD_GUIDE.md for more detailed instructions.');
    }
    catch (error) {
        console.error('Error preparing iOS build:', error);
        process.exit(1);
    }
}
prepareiOSBuild();
