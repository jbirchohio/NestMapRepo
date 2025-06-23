import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files to clean up
const FILES_TO_CLEAN = [
  'server/@types/express/index.d.ts',
  'server/src/types/express/index.d.ts'
];

// Content to leave in the files (just the export if empty)
const EMPTY_FILE_CONTENT = `// This file intentionally left blank
// All Express type extensions have been moved to src/express-augmentations.d.ts
export {};
`;

async function cleanupFiles() {
  console.log('🚀 Starting Express type cleanup...');
  
  for (const filePath of FILES_TO_CLEAN) {
    const fullPath = path.join(process.cwd(), filePath);
    
    try {
      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        console.log(`ℹ️  Skipping non-existent file: ${filePath}`);
        continue;
      }
      
      // Get current content
      const currentContent = await fs.readFile(fullPath, 'utf8');
      
      // Skip if already cleaned
      if (currentContent.includes('intentionally left blank')) {
        console.log(`✅ Already cleaned: ${filePath}`);
        continue;
      }
      
      // Backup the original file
      const backupPath = `${fullPath}.bak`;
      await fs.writeFile(backupPath, currentContent);
      
      // Write empty content
      await fs.writeFile(fullPath, EMPTY_FILE_CONTENT);
      
      console.log(`✅ Cleaned and backed up: ${filePath} (original saved to ${path.basename(backupPath)})`);
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }
  
  console.log('\n🎉 Cleanup complete!');
  console.log('All Express type extensions are now centralized in src/express-augmentations.d.ts');
}

// Run the cleanup
cleanupFiles().catch(console.error);
