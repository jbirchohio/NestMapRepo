#!/usr/bin/env node
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const result = execSync('tsc -p . --noEmit --skipLibCheck', { 
    encoding: 'utf-8',
    cwd: __dirname,
    stdio: 'pipe'
  });
  console.log('TypeScript check completed successfully!');
  console.log(result);
} catch (error) {
  console.log('TypeScript errors found:');
  console.log(error.stdout || error.stderr);
}