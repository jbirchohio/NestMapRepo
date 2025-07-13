import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const BATCH_SIZE = 10; // Reduced batch size to prevent memory issues
const TSC_CMD = 'npx tsc --noEmit';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TSCONFIG_PATH = path.join(__dirname, 'tsconfig.json');

// Get all TypeScript/TSX files from the project
function getTypeScriptFiles() {
  const excludeDirs = ['node_modules', 'dist', 'build', '.next', 'coverage'];
  const tsFiles = [];

  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!excludeDirs.includes(file) && !file.startsWith('.')) {
          walkDir(filePath);
        }
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        tsFiles.push(filePath);
      }
    });
  }

  walkDir('.');
  return tsFiles;
}

// Process files in batches
function processInBatches(files, batchSize) {
  const batches = [];
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }
  return batches;
}

// Run TypeScript check on a batch of files
function runTypeScriptCheck(files) {
  console.log(`\nChecking ${files.length} files...`);
  
  try {
    // Create a temporary tsconfig that only includes the current batch of files
    const tsconfig = JSON.parse(fs.readFileSync(TSCONFIG_PATH, 'utf-8'));
    tsconfig.include = files;
    
    const tempTsconfigPath = path.join(__dirname, 'tsconfig.temp.json');
    fs.writeFileSync(tempTsconfigPath, JSON.stringify(tsconfig, null, 2));
    
    // Run TypeScript check with the temporary config
    execSync(`${TSC_CMD} -p ${tempTsconfigPath}`, { stdio: 'inherit' });
    
    // Clean up
    fs.unlinkSync(tempTsconfigPath);
    
    return true;
  } catch (error) {
    console.error('TypeScript check failed for batch');
    return false;
  }
}

// Main function
function main() {
  console.log('Starting TypeScript type checking in batches...');
  
  const tsFiles = getTypeScriptFiles();
  console.log(`Found ${tsFiles.length} TypeScript files to check`);
  
  const batches = processInBatches(tsFiles, BATCH_SIZE);
  console.log(`Processing in ${batches.length} batches of ${BATCH_SIZE} files each`);
  
  let hasErrors = false;
  
  for (let i = 0; i < batches.length; i++) {
    console.log(`\n--- Batch ${i + 1}/${batches.length} ---`);
    const success = runTypeScriptCheck(batches[i]);
    
    if (!success) {
      hasErrors = true;
      console.log(`TypeScript check failed in batch ${i + 1}. Stopping...`);
      break;
    }
  }
  
  if (hasErrors) {
    console.error('\n❌ TypeScript check completed with errors');
    process.exit(1);
  } else {
    console.log('\n✅ TypeScript check completed successfully');
  }
}

main();
