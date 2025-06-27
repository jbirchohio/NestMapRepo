import { readFile, writeFile, stat } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// List of test files to update
const testFiles = [
  'tests/analytics.test.ts',
  'tests/ai-integration.test.ts',
  'tests/activities.test.ts',
  'tests/organizations.test.ts',
  'tests/trips.test.ts',
  'tests/subscription-limits.test.ts',
  'tests/white-label-integration.test.ts',
  'tests/auth/jwt.test.ts',
  'tests/auth.test.ts'
];

async function updateTestFile(filePath) {
  try {
    const fullPath = join(__dirname, filePath);
    
    try {
      await stat(fullPath);
    } catch (error) {
      console.log(`File not found: ${filePath}`);
      return false;
    }

    let content = await readFile(fullPath, 'utf8');
    
    // Fix supertest imports and usage
    if (content.includes("import * as request from 'supertest'")) {
      // Revert to default import
      content = content.replace(
        /import \* as request from 'supertest';/g,
        "import request from 'supertest';"
      );
      
      // Fix request.default(app) to request(app)
      content = content.replace(
        /request\.default\((app|server)\)/g,
        'request($1)'
      );
      
      await writeFile(fullPath, content, 'utf8');
      console.log(`Fixed imports in ${filePath}`);
      return true;
    }
    
    console.log(`No changes needed for ${filePath}`);
    return false;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
    return false;
  }
}

async function main() {
  console.log('Fixing test imports...');
  let updatedCount = 0;
  
  for (const file of testFiles) {
    if (await updateTestFile(file)) {
      updatedCount++;
    }
  }
  
  console.log(`\nUpdated ${updatedCount} of ${testFiles.length} test files.`);
}

main().catch(console.error);
