#!/usr/bin/env tsx
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

// Old import patterns to replace
const OLD_IMPORTS = [
  {
    // From server/utils/secureJwt.ts
    from: ['../../utils/secureJwt.js', '../../utils/secureJwt'],
    to: '../../src/auth/jwt/index.js',
    functions: {
      generateToken: 'generateToken',
      verifyToken: 'verifyToken',
      generateAuthTokens: 'generateTokenPair',
      refreshAccessToken: 'refreshAccessToken',
      generatePasswordResetToken: 'generatePasswordResetToken',
      verifyPasswordResetToken: 'verifyToken',
      revokeToken: 'revokeRefreshToken',
      revokeAllUserTokens: 'revokeAllUserRefreshTokens',
    },
  },
  {
    // From server/utils/auth.ts
    from: ['../../utils/auth.js', '../../utils/auth'],
    to: '../../src/auth/jwt/index.js',
    functions: {
      generateToken: 'generateRandomString',
    },
  },
];

async function updateFile(filePath: string) {
  let content = await fs.readFile(filePath, 'utf-8');
  let updated = false;

  for (const { from, to, functions } of OLD_IMPORTS) {
    for (const oldFrom of from) {
      // Check if file imports from old path
      const importRegex = new RegExp(
        `from\\s+['"](${oldFrom}(?:\\.js)?)['"]`,
        'g'
      );

      if (importRegex.test(content)) {
        console.log(`Updating imports in ${filePath}`);
        
        // Replace the import path
        content = content.replace(importRegex, `from '${to}'`);
        
        // Replace function usages
        for (const [oldFn, newFn] of Object.entries(functions)) {
          const fnRegex = new RegExp(`\\b${oldFn}\\b`, 'g');
          if (fnRegex.test(content)) {
            content = content.replace(fnRegex, newFn);
            console.log(`  - Replaced ${oldFn} with ${newFn}`);
          }
        }
        
        updated = true;
      }
    }
  }

  if (updated) {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`✅ Updated ${filePath}`);
  }
}

async function main() {
  try {
    // Find all TypeScript and JavaScript files
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: PROJECT_ROOT,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    });

    console.log(`Found ${files.length} files to process`);

    for (const file of files) {
      const filePath = path.join(PROJECT_ROOT, file);
      await updateFile(filePath);
    }

    console.log('✅ Done updating JWT imports');
  } catch (error) {
    console.error('Error updating JWT imports:', error);
    process.exit(1);
  }
}

main();