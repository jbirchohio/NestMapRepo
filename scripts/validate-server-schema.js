#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { camelCase, snakeCase } = require('lodash');

class ServerSchemaValidator {
  constructor() {
    this.serverSchemaPath = path.join(__dirname, '../server/src/schema');
    this.clientTypesPath = path.join(__dirname, '../client/src/types');
    this.errors = [];
    this.warnings = [];
  }

  async validate() {
    console.log('🔍 Validating server schema alignment...');
    
    try {
      // 1. Load server schema
      const serverTypes = this.loadServerTypes();
      
      // 2. Load client types
      const clientTypes = this.loadClientTypes();
      
      // 3. Validate types match with case conversion
      this.validateTypes(serverTypes, clientTypes);
      
      // 4. Report results
      this.reportResults();
      
      return this.errors.length === 0;
    } catch (error) {
      console.error('❌ Validation error:', error);
      return false;
    }
  }

  loadServerTypes() {
    console.log('📂 Loading server schema...');
    const types = {};
    
    // Look for schema files in server/src/schema
    if (!fs.existsSync(this.serverSchemaPath)) {
      throw new Error(`Server schema directory not found at ${this.serverSchemaPath}`);
    }
    
    const schemaFiles = fs.readdirSync(this.serverSchemaPath)
      .filter(file => file.endsWith('.ts') || file.endsWith('.d.ts'));
    
    for (const file of schemaFiles) {
      const filePath = path.join(this.serverSchemaPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract interface definitions
      const interfaceMatches = content.matchAll(/export\s+(?:interface|type)\s+(\w+)\s*{([^}]+)}/g);
      for (const match of interfaceMatches) {
        const name = match[1];
        const fields = {};
        
        // Extract field definitions
        const fieldMatches = match[2].matchAll(/^\s*(\w+)\??:\s*([^;\n]+)/gm);
        for (const field of fieldMatches) {
          fields[field[1]] = field[2].trim();
        }
        
        types[name] = { fields, file };
      }
    }
    
    return types;
  }

  loadClientTypes() {
    console.log('📱 Loading client types...');
    const types = {};
    
    if (!fs.existsSync(this.clientTypesPath)) {
      console.warn(`⚠️  Client types directory not found at ${this.clientTypesPath}`);
      return types;
    }
    
    // Recursively find all TypeScript files in client types
    const findTypeFiles = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      let files = [];
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files = [...files, ...findTypeFiles(fullPath)];
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
      
      return files;
    };
    
    const typeFiles = findTypeFiles(this.clientTypesPath);
    
    for (const filePath of typeFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract interface/type definitions
      const typeMatches = content.matchAll(/export\s+(?:interface|type)\s+(\w+)\s*(?:<[^>]+>)?\s*{([^}]+)}/g);
      for (const match of typeMatches) {
        const name = match[1];
        const fields = {};
        
        // Extract field definitions
        const fieldMatches = match[2].matchAll(/^\s*(\w+)\??:\s*([^;\n]+)/gm);
        for (const field of fieldMatches) {
          fields[field[1]] = field[2].trim();
        }
        
        types[name] = { fields, file: path.relative(process.cwd(), filePath) };
      }
    }
    
    return types;
  }

  validateTypes(serverTypes, clientTypes) {
    console.log('🔍 Validating type alignment...');
    
    // Check each server type has a corresponding client type
    for (const [typeName, serverType] of Object.entries(serverTypes)) {
      if (!clientTypes[typeName]) {
        this.warnings.push(`Client type '${typeName}' not found (defined in ${serverType.file})`);
        continue;
      }
      
      const clientType = clientTypes[typeName];
      this.validateTypeFields(typeName, serverType, clientType);
    }
    
    // Check for client types that don't exist on the server
    for (const [typeName, clientType] of Object.entries(clientTypes)) {
      if (!serverTypes[typeName]) {
        this.warnings.push(`Server type '${typeName}' not found (defined in ${clientType.file})`);
      }
    }
  }

  validateTypeFields(typeName, serverType, clientType) {
    const serverFields = serverType.fields;
    const clientFields = clientType.fields;
    
    // Check each server field has a corresponding client field (with case conversion)
    for (const [serverFieldName, serverFieldType] of Object.entries(serverFields)) {
      const expectedClientFieldName = camelCase(serverFieldName);
      
      if (!clientFields[expectedClientFieldName]) {
        this.errors.push(
          `Field '${serverFieldName}' in server type '${typeName}' ` +
          `has no corresponding client field '${expectedClientFieldName}' ` +
          `(client type defined in ${clientType.file})`
        );
        continue;
      }
      
      // Check type compatibility (simplified)
      const clientFieldType = clientFields[expectedClientFieldName];
      if (!this.typesAreCompatible(serverFieldType, clientFieldType)) {
        this.errors.push(
          `Type mismatch for '${typeName}.${serverFieldName}': ` +
          `Server has '${serverFieldType}' but client has '${clientFieldType}'`
        );
      }
    }
    
    // Check for client fields that don't exist on the server
    for (const clientFieldName of Object.keys(clientFields)) {
      const serverFieldName = snakeCase(clientFieldName);
      if (!serverFields[serverFieldName]) {
        this.warnings.push(
          `Field '${clientFieldName}' in client type '${typeName}' ` +
          `has no corresponding server field '${serverFieldName}' ` +
          `(server type defined in ${serverType.file})`
        );
      }
    }
  }

  typesAreCompatible(serverType, clientType) {
    // Remove null/undefined and array notations for comparison
    const normalizeType = (type) => {
      return type
        .replace(/\|\s*null\s*$/, '')
        .replace(/\|\s*undefined\s*$/, '')
        .replace(/\[\s*\]\s*$/, '');
    };
    
    const serverBase = normalizeType(serverType);
    const clientBase = normalizeType(clientType);
    
    // Simple type mapping (expand as needed)
    const typeMap = {
      'string': ['string', 'Date'],
      'number': ['number', 'bigint'],
      'boolean': ['boolean', 'bool'],
      'Date': ['Date', 'string', 'number'],
    };
    
    // Check if types are compatible
    if (serverBase === clientBase) return true;
    
    // Check if types are compatible through mapping
    return typeMap[serverBase]?.includes(clientBase) || 
           Object.entries(typeMap).some(([key, values]) => 
             values.includes(serverBase) && values.includes(clientBase)
           );
  }

  reportResults() {
    console.log('\n📊 Validation Results:');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ No issues found! Server and client schemas are aligned.');
      return;
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
    }
    
    console.log(`\nFound ${this.errors.length} error(s) and ${this.warnings.length} warning(s)`);
    
    if (this.errors.length > 0) {
      console.log('\n💡 Run `npm run type-check` in both client and server directories for more detailed type checking.');
    }
  }
}

// Run the validator if this file is executed directly
if (require.main === module) {
  const validator = new ServerSchemaValidator();
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = ServerSchemaValidator;
