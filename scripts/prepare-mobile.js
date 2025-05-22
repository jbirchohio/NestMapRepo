import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROD_URL = process.env.PROD_URL || 'https://your-nestmap-production-url.com';

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
 * Update capacitor.config.ts with production URL
 */
const updateCapacitorConfig = () => {
  try {
    const configPath = path.join(__dirname, '../capacitor.config.ts');
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Update the server URL for production
    configContent = configContent.replace(
      /\/\/ url: 'https:\/\/nestmap\.vercel\.app'/,
      `url: '${PROD_URL}'`
    );
    
    // Save the updated config
    fs.writeFileSync(configPath, configContent, 'utf8');
    console.log(`Updated capacitor.config.ts with production URL: ${PROD_URL}`);
  } catch (error) {
    console.error('Error updating capacitor config:', error);
    throw error;
  }
};

/**
 * Main preparation function
 */
async function prepareMobile() {
  try {
    console.log('Preparing NestMap for mobile app stores...');
    
    // 1. Update capacitor config with production URL
    updateCapacitorConfig();
    
    // 2. Build the web app
    await runCommand('npm run build');
    
    // 3. Initialize Capacitor if needed (first time)
    if (!fs.existsSync('capacitor.config.json')) {
      await runCommand('npx cap init NestMap com.nestmap.app --web-dir=dist');
    }
    
    // 4. Copy the web assets to the Capacitor app
    await runCommand('npx cap copy');
    
    // 5. Add platforms if they don't exist
    const androidExists = fs.existsSync('android');
    const iosExists = fs.existsSync('ios');
    
    if (!androidExists) {
      console.log('Adding Android platform...');
      await runCommand('npx cap add android');
    } else {
      console.log('Android platform already exists, updating...');
      await runCommand('npx cap update android');
    }
    
    if (!iosExists) {
      console.log('Adding iOS platform...');
      await runCommand('npx cap add ios');
    } else {
      console.log('iOS platform already exists, updating...');
      await runCommand('npx cap update ios');
    }
    
    // 6. Sync the app with the latest changes
    await runCommand('npx cap sync');
    
    console.log('\n===== MOBILE PREPARATION COMPLETE =====');
    console.log('Next steps:');
    console.log('1. Android: Open the project in Android Studio:');
    console.log('   npx cap open android');
    console.log('2. iOS: Open the project in Xcode:');
    console.log('   npx cap open ios');
    console.log('3. Follow the platform-specific build instructions in MOBILE_BUILD_GUIDE.md');
    
  } catch (error) {
    console.error('Error preparing mobile app:', error);
    process.exit(1);
  }
}

prepareMobile();