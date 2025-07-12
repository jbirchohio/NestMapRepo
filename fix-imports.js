#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find all TypeScript files with malformed imports
function findTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && item !== 'node_modules' && item !== '.git') {
      files.push(...findTsFiles(fullPath));
    } else if (item.endsWith('.ts') || item.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Fix malformed imports in a file
function fixImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let fixed = content;
  let changes = 0;
  
  // Pattern: import ... from 'path1'/path2' -> import ... from 'path1'
  const malformedImportPattern = /import\s+({[^}]+}|\w+)\s+from\s+'([^']+)'\s*\/[^;]+;/g;
  
  fixed = fixed.replace(malformedImportPattern, (match, imported, basePath) => {
    changes++;
    
    // Special handling for common patterns
    if (basePath.includes('shared/src/schema.js')) {
      // Most imports should be from the shared schema
      if (imported.includes('AuthUser')) {
        return `import { User } from '${basePath}';`;
      } else if (imported.includes('userSessions')) {
        return `import { userSessions } from '${basePath}';`;
      } else if (imported.includes('organizations') || imported.includes('users') || imported.includes('customDomains')) {
        return `import ${imported} from '${basePath}';`;
      } else if (imported.includes('notifications')) {
        return `import { notifications } from '${basePath}';`;
      } else if (imported.includes('adminAuditLog')) {
        return `import { users, adminAuditLog, organizations, userSessions } from '${basePath}';`;
      } else if (imported.includes('db')) {
        return `import { db } from '../../db.js';`;
      } else {
        return `import ${imported} from '${basePath}';`;
      }
    }
    
    // Default case - just use the base path
    return `import ${imported} from '${basePath}';`;
  });
  
  if (changes > 0) {
    fs.writeFileSync(filePath, fixed);
    console.log(`Fixed ${changes} imports in ${filePath}`);
  }
  
  return changes;
}

// Main execution
const serverDir = path.join(__dirname, 'server');
const tsFiles = findTsFiles(serverDir);

let totalChanges = 0;
for (const file of tsFiles) {
  const changes = fixImports(file);
  totalChanges += changes;
}

console.log(`\nTotal files processed: ${tsFiles.length}`);
console.log(`Total imports fixed: ${totalChanges}`);