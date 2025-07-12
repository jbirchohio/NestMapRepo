#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find all TypeScript files
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

// Fix missing file extensions
function fixMissingExtensions(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let fixed = content;
  let changes = 0;
  
  // Pattern: import ... from './file' -> import ... from './file.js'
  // Pattern: import ... from '../file' -> import ... from '../file.js'
  const relativeImportPattern = /import\s+.*?\s+from\s+['"](\.\/?[^'"]*?)['"];/g;
  
  fixed = fixed.replace(relativeImportPattern, (match, importPath) => {
    // Skip if already has extension
    if (importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.endsWith('.d.ts')) {
      return match;
    }
    
    // Skip if it's a directory import (ends with slash)
    if (importPath.endsWith('/')) {
      return match;
    }
    
    // Check if the file exists with .ts extension
    const fullPath = path.resolve(path.dirname(filePath), importPath);
    const tsFile = fullPath + '.ts';
    const jsFile = fullPath + '.js';
    
    if (fs.existsSync(tsFile) || fs.existsSync(jsFile)) {
      changes++;
      return match.replace(importPath, importPath + '.js');
    }
    
    return match;
  });
  
  if (changes > 0) {
    fs.writeFileSync(filePath, fixed);
    console.log(`Fixed ${changes} missing extensions in ${filePath}`);
  }
  
  return changes;
}

// Main execution
const serverDir = path.join(__dirname, 'server');
const tsFiles = findTsFiles(serverDir);

let totalChanges = 0;
for (const file of tsFiles) {
  try {
    const changes = fixMissingExtensions(file);
    totalChanges += changes;
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
}

console.log(`\nTotal files processed: ${tsFiles.length}`);
console.log(`Total extensions fixed: ${totalChanges}`);