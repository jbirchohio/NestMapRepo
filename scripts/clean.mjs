import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const directories = {
  shared: path.join(__dirname, '..', 'shared', 'dist'),
  server: path.join(__dirname, '..', 'server', 'dist'),
  client: path.join(__dirname, '..', 'client', 'dist')
};

function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    console.log(`Cleaning ${dirPath}`);
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`Successfully cleaned ${dirPath}`);
    } catch (error) {
      console.error(`Error cleaning ${dirPath}:`, error.message);
    }
  } else {
    console.log(`Directory does not exist, skipping: ${dirPath}`);
  }
}

// Get the target from command line arguments or default to 'all'
const target = process.argv[2] || 'all';

console.log('Starting clean process...');

if (target === 'all') {
  // Clean all directories
  Object.values(directories).forEach(removeDirectory);
  console.log('All clean operations completed.');
} else if (directories[target]) {
  // Clean specific directory
  removeDirectory(directories[target]);
} else {
  console.error(`Invalid target: ${target}. Use one of: all, ${Object.keys(directories).join(', ')}`);
  process.exit(1);
}

console.log('Clean process completed.');
