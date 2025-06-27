import { readFile, writeFile, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List of test files to update
const testFiles = [
  'tests/analytics.test.ts',
  'tests/ai-integration.test.ts',
  'tests/activities.test.ts',
  'tests/organizations.test.ts',
  'tests/trips.test.ts',
  'tests/subscription-limits.test.ts',
  'tests/white-label-integration.test.ts',
  'tests/auth/jwt.test.ts'
];

// Function to update imports in a file
async function updateImports(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    
    try {
      await stat(fullPath);
    } catch (error) {
      console.log(`File not found: ${filePath}`);
      return false;
    }

    let content = await readFile(fullPath, 'utf8');
    
    // Check if file needs updating
    if (!content.includes("import request from 'supertest'")) {
      console.log(`No update needed for ${filePath}`);
      return false;
    }

    // Update the import
    content = content.replace(
      /import request from 'supertest';/g,
      "import * as request from 'supertest';"
    );

    // Update request(app) to request.default(app)
    content = content.replace(
      /(\s+)request\((app|server)\)/g,
      '$1request.default($2)'
    );

    await writeFile(fullPath, content, 'utf8');
    console.log(`Updated imports in ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
    return false;
  }
}

// Process all test files
async function main() {
  let updatedCount = 0;
  
  for (const file of testFiles) {
    if (await updateImports(file)) {
      updatedCount++;
    }
  }
  
  console.log(`\nUpdated ${updatedCount} of ${testFiles.length} test files.`);
}

main().catch(console.error);
