#!/usr/bin/env node

/**
 * Schema Validation Test
 * Tests that all the new schema definitions are properly configured
 */

import fs from 'fs';
import path from 'path';

async function validateSchema() {
  try {
    console.log('🔍 Validating schema file...');
    
    // Check if schema file exists and is readable
    const schemaPath = path.join(process.cwd(), 'server/src/db/schema.ts');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Schema file not found');
    }
    
    // Import the schema (this will fail if there are syntax errors)
    const schema = await import('./server/src/db/schema.ts');
    
    // Check that all the new tables are exported
    const expectedTables = [
      // Voice Interface
      'voiceSessions',
      'voiceCommands',
      
      // AI Assistant
      'aiConversations', 
      'aiMessages',
      
      // Smart City
      'smartCities',
      'smartCityData',
      'iotDevices',
      
      // Autonomous Vehicles
      'autonomousVehicles',
      'vehicleBookings',
      
      // Marketplace
      'marketplaceApps',
      'appInstallations',
      'appReviews',
      
      // Automation
      'automationWorkflows',
      'workflowExecutions',
      
      // Carbon Footprint
      'carbonFootprints',
      'carbonOffsets',
      
      // Analytics
      'analyticsModels',
      'predictions',
      'analyticsReports'
    ];
    
    const missingTables = [];
    for (const table of expectedTables) {
      if (!schema[table]) {
        missingTables.push(table);
      }
    }
    
    if (missingTables.length > 0) {
      throw new Error(`Missing tables in schema: ${missingTables.join(', ')}`);
    }
    
    console.log('✅ Schema validation passed!');
    console.log(`📊 Found ${expectedTables.length} new feature tables`);
    
    // Check migration file exists
    const migrationPath = path.join(process.cwd(), 'migrations/0005_add_readme_features.sql');
    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file not found');
    }
    
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    if (migrationContent.length < 1000) {
      throw new Error('Migration file seems incomplete');
    }
    
    console.log('✅ Migration file validation passed!');
    console.log(`📄 Migration file size: ${Math.round(migrationContent.length / 1024)}KB`);
    
    return {
      success: true,
      tablesCount: expectedTables.length,
      migrationSize: migrationContent.length
    };
    
  } catch (error) {
    console.error('❌ Schema validation failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateSchema().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

export { validateSchema };