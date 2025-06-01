#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building NestMap for Railway deployment...');

// Build the frontend
console.log('📦 Building React frontend...');
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Frontend build failed:', error);
    return;
  }
  
  console.log('✅ Frontend build completed!');
  console.log(stdout);
  
  // Check if dist directory was created
  if (fs.existsSync('dist')) {
    console.log('✅ Build artifacts created in dist/ directory');
    
    // List contents of dist directory
    const distContents = fs.readdirSync('dist');
    console.log('📁 dist/ contains:', distContents);
    
    console.log('\n🎉 NestMap is ready for Railway deployment!');
    console.log('\n📋 Next steps:');
    console.log('1. Push your code to GitHub');
    console.log('2. Connect your GitHub repo to Railway');
    console.log('3. Set environment variables in Railway dashboard:');
    console.log('   - VITE_SUPABASE_URL');
    console.log('   - VITE_SUPABASE_ANON_KEY'); 
    console.log('   - OPENAI_API_KEY');
    console.log('   - MAPBOX_TOKEN');
    console.log('   - DATABASE_URL (if using external DB)');
    console.log('4. Deploy! 🚀');
  } else {
    console.log('⚠️  Build completed but dist/ directory not found');
  }
});