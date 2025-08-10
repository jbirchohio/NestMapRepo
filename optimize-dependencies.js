#!/usr/bin/env node

/**
 * Dependency Optimization Script for Remvana
 * Run with: node optimize-dependencies.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKUP_FILE = 'package.json.backup';
const LOCK_BACKUP = 'package-lock.json.backup';

// Packages to remove completely
const REMOVE_DEPS = [
  '@capacitor/android',
  '@capacitor/core',
  '@capacitor/ios',
  'bcrypt',
  '@types/bcrypt',
  'react-icons',
  'zod-validation-error'
];

// Packages to move from dependencies to devDependencies
const MOVE_TO_DEV = [
  '@capacitor/cli',
  '@types/jsonwebtoken',
  '@types/pg',
  '@types/qrcode'
];

// Packages to remove from devDependencies
const REMOVE_DEV_DEPS = [
  'autoprefixer',
  'cross-env',
  'postcss'
];

// Version updates for security fixes
const VERSION_UPDATES = {
  'vite': '^7.1.1',
  'drizzle-kit': '^0.31.4'
};

function backup() {
  console.log('📦 Creating backups...');
  fs.copyFileSync('package.json', BACKUP_FILE);
  if (fs.existsSync('package-lock.json')) {
    fs.copyFileSync('package-lock.json', LOCK_BACKUP);
  }
  console.log('✅ Backups created');
}

function loadPackageJson() {
  return JSON.parse(fs.readFileSync('package.json', 'utf8'));
}

function savePackageJson(pkg) {
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
}

function optimizeDependencies() {
  console.log('\n🔧 Starting dependency optimization...\n');
  
  // Create backup
  backup();
  
  // Load package.json
  let pkg = loadPackageJson();
  let changesMade = false;
  
  // Remove unused dependencies
  console.log('🗑️  Removing unused dependencies...');
  REMOVE_DEPS.forEach(dep => {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      delete pkg.dependencies[dep];
      console.log(`   - Removed ${dep}`);
      changesMade = true;
    }
  });
  
  // Move packages to devDependencies
  console.log('\n📋 Moving packages to devDependencies...');
  MOVE_TO_DEV.forEach(dep => {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      if (!pkg.devDependencies) pkg.devDependencies = {};
      pkg.devDependencies[dep] = pkg.dependencies[dep];
      delete pkg.dependencies[dep];
      console.log(`   - Moved ${dep} to devDependencies`);
      changesMade = true;
    }
  });
  
  // Remove unused devDependencies
  console.log('\n🗑️  Removing unused devDependencies...');
  REMOVE_DEV_DEPS.forEach(dep => {
    if (pkg.devDependencies && pkg.devDependencies[dep]) {
      delete pkg.devDependencies[dep];
      console.log(`   - Removed ${dep}`);
      changesMade = true;
    }
  });
  
  // Update versions for security
  console.log('\n🔒 Updating packages for security...');
  Object.entries(VERSION_UPDATES).forEach(([dep, version]) => {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      pkg.dependencies[dep] = version;
      console.log(`   - Updated ${dep} to ${version}`);
      changesMade = true;
    }
    if (pkg.devDependencies && pkg.devDependencies[dep]) {
      pkg.devDependencies[dep] = version;
      console.log(`   - Updated ${dep} to ${version}`);
      changesMade = true;
    }
  });
  
  if (!changesMade) {
    console.log('\n✅ No changes needed - dependencies already optimized!');
    return;
  }
  
  // Save optimized package.json
  savePackageJson(pkg);
  console.log('\n✅ package.json optimized');
  
  // Offer to run npm install
  console.log('\n📦 Changes saved. Next steps:');
  console.log('   1. Run: npm install');
  console.log('   2. Run: npm dedupe');
  console.log('   3. Run: npm audit');
  console.log('   4. Run: npm run build (to verify everything works)');
  console.log('\n💡 To rollback changes:');
  console.log(`   - cp ${BACKUP_FILE} package.json`);
  console.log(`   - cp ${LOCK_BACKUP} package-lock.json`);
  console.log('   - npm install');
}

function analyzeCurrentState() {
  console.log('📊 Analyzing current dependency state...\n');
  
  const pkg = loadPackageJson();
  const deps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});
  
  console.log(`Total dependencies: ${deps.length}`);
  console.log(`Total devDependencies: ${devDeps.length}`);
  console.log(`Combined total: ${deps.length + devDeps.length}`);
  
  // Check for issues
  const issues = [];
  
  // Check for @types in dependencies
  const typesInDeps = deps.filter(d => d.startsWith('@types/'));
  if (typesInDeps.length > 0) {
    issues.push(`Found ${typesInDeps.length} @types packages in dependencies (should be in devDependencies)`);
  }
  
  // Check for Capacitor packages
  const capacitorDeps = deps.filter(d => d.includes('@capacitor'));
  if (capacitorDeps.length > 0) {
    issues.push(`Found ${capacitorDeps.length} Capacitor packages (mobile platform not in use)`);
  }
  
  // Check for Radix UI explosion
  const radixCount = deps.filter(d => d.includes('@radix-ui')).length;
  if (radixCount > 20) {
    issues.push(`Found ${radixCount} Radix UI packages (consider consolidation)`);
  }
  
  if (issues.length > 0) {
    console.log('\n⚠️  Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('\n✅ No obvious issues found');
  }
  
  console.log('\n📈 Potential savings after optimization:');
  console.log(`   - Remove ${REMOVE_DEPS.length} unused dependencies`);
  console.log(`   - Move ${MOVE_TO_DEV.length} packages to devDependencies`);
  console.log(`   - Remove ${REMOVE_DEV_DEPS.length} unused devDependencies`);
  console.log(`   - Total reduction: ${REMOVE_DEPS.length + REMOVE_DEV_DEPS.length} packages`);
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--analyze')) {
    analyzeCurrentState();
  } else if (args.includes('--help')) {
    console.log('Usage: node optimize-dependencies.js [options]');
    console.log('Options:');
    console.log('  --analyze    Analyze current state without making changes');
    console.log('  --help       Show this help message');
    console.log('\nWithout options, the script will optimize dependencies');
  } else {
    analyzeCurrentState();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Ask for confirmation
    console.log('⚠️  This will modify package.json');
    console.log('   Backups will be created automatically\n');
    
    optimizeDependencies();
  }
}