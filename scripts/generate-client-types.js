#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { camelCase, upperFirst } = require('lodash');

class ClientTypeGenerator {
  constructor() {
    this.serverSchemaPath = path.join(__dirname, '../server/src/schema');
    this.outputPath = path.join(__dirname, '../client/src/types/generated/server.types.ts');
    this.types = new Map();
  }

  async generate() {
    console.log('🚀 Generating client types from server schema...');
    
    try {
      // 1. Load server schema
      await this.loadServerTypes();
      
      // 2. Generate TypeScript content
      const content = this.generateTypeScript();
      
      // 3. Ensure output directory exists
      const outputDir = path.dirname(this.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // 4. Write to file
      fs.writeFileSync(this.outputPath, content);
      
      console.log(`✅ Types generated successfully at ${this.outputPath}`);
      return true;
    } catch (error) {
      console.error('❌ Error generating types:', error);
      return false;
    }
  }

  async loadServerTypes() {
    if (!fs.existsSync(this.serverSchemaPath)) {
      throw new Error(`Server schema directory not found at ${this.serverSchemaPath}`);
    }
    
    const schemaFiles = fs.readdirSync(this.serverSchemaPath)
      .filter(file => file.endsWith('.ts') || file.endsWith('.d.ts'));
    
    for (const file of schemaFiles) {
      const filePath = path.join(this.serverSchemaPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract interface/type definitions
      const typeMatches = content.matchAll(/export\s+(?:interface|type)\s+(\w+)\s*(?:<[^>]+>)?\s*{([^}]+)}/g);
      
      for (const match of typeMatches) {
        const name = match[1];
        const fields = [];
        
        // Extract field definitions
        const fieldMatches = match[2].matchAll(/^\s*(\w+)\??:\s*([^;\n]+)/gm);
        for (const field of fieldMatches) {
          const fieldName = field[1];
          const fieldType = this.mapServerToClientType(field[2].trim());
          const isOptional = field[0].includes('?');
          
          fields.push({
            originalName: fieldName,
            name: camelCase(fieldName),
            type: fieldType,
            isOptional,
            originalType: field[2].trim()
          });
        }
        
        this.types.set(name, { name, fields, file });
      }
    }
  }

  mapServerToClientType(serverType) {
    // Handle primitive types
    const typeMap = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'Date': 'string', // Convert server Date to string on client
      'Record<string, any>': 'Record<string, unknown>',
      'any': 'unknown',
    };
    
    // Handle arrays
    if (serverType.endsWith('[]')) {
      const elementType = this.mapServerToClientType(serverType.slice(0, -2).trim());
      return `${elementType}[]`;
    }
    
    // Handle union types
    if (serverType.includes('|')) {
      return serverType.split('|')
        .map(t => this.mapServerToClientType(t.trim()))
        .join(' | ');
    }
    
    // Handle optional types
    if (serverType.endsWith(' | null') || serverType.endsWith(' | undefined')) {
      const baseType = serverType.split('|')[0].trim();
      return `${this.mapServerToClientType(baseType)} | null`;
    }
    
    // Check if it's a custom type (not a primitive)
    if (!Object.values(typeMap).includes(serverType)) {
      // Assume it's a custom type that should be imported
      return serverType;
    }
    
    return typeMap[serverType] || 'unknown';
  }

  generateTypeScript() {
    let output = '// AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY\n';
    output += '// This file is generated automatically from the server schema\n\n';
    
    // Add header
    output += '/* eslint-disable */\n\n';
    output += '// Base types\n';
    output += 'type Nullable<T> = T | null;\n';
    output += 'type Optional<T> = T | undefined;\n\n';
    
    // Generate enums (if any)
    // Note: You'll need to manually define enums in your server schema
    
    // Generate interfaces
    output += '// Interfaces\n';
    for (const [typeName, typeInfo] of this.types.entries()) {
      output += `export interface ${typeName} {\n`;
      
      for (const field of typeInfo.fields) {
        const optional = field.isOptional ? '?' : '';
        const fieldType = this.types.has(field.type) ? field.type : this.mapServerToClientType(field.originalType);
        
        output += `  ${field.name}${optional}: ${fieldType};`;
        output += ` // Original: ${field.originalName}: ${field.originalType}`;
        output += '\n';
      }
      
      output += '}\n\n';
    }
    
    // Generate input types (for create/update operations)
    output += '// Input types (for create/update operations)\n';
    for (const [typeName, typeInfo] of this.types.entries()) {
      // Skip if it's already an input type
      if (typeName.endsWith('Input') || typeName.endsWith('CreateInput') || typeName.endsWith('UpdateInput')) {
        continue;
      }
      
      output += `export interface ${typeName}Input {\n`;
      
      for (const field of typeInfo.fields) {
        // Skip auto-generated fields
        if (['id', 'createdAt', 'updatedAt'].includes(field.name)) {
          continue;
        }
        
        const fieldType = this.types.has(field.type) ? field.type : this.mapServerToClientType(field.originalType);
        
        // Make all fields optional for input types
        output += `  ${field.name}?: ${fieldType};`;
        output += ` // From ${typeName}.${field.originalName}`;
        output += '\n';
      }
      
      output += '}\n\n';
    }
    
    return output;
  }
}

// Run the generator if this file is executed directly
if (require.main === module) {
  const generator = new ClientTypeGenerator();
  generator.generate().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = ClientTypeGenerator;
