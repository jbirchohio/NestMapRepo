#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

class SchemaValidator {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'nestmap',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    
    this.errors = [];
    this.sharedTypesPath = path.join(__dirname, '../shared/types/database.d.ts');
  }

  async validate() {
    console.log('🔍 Validating schema alignment...');
    
    try {
      // 1. Load shared types
      const sharedTypes = this.loadSharedTypes();
      
      // 2. Get database schema
      const dbSchema = await this.getDatabaseSchema();
      
      // 3. Validate tables and columns
      this.validateTables(sharedTypes, dbSchema);
      
      // 4. Validate enums
      this.validateEnums(sharedTypes, dbSchema);
      
      // 5. Report results
      this.reportResults();
      
      return this.errors.length === 0;
    } catch (error) {
      console.error('❌ Validation error:', error);
      return false;
    } finally {
      await this.pool.end();
    }
  }

  loadSharedTypes() {
    if (!fs.existsSync(this.sharedTypesPath)) {
      throw new Error(`Shared types file not found at ${this.sharedTypesPath}`);
    }
    
    const content = fs.readFileSync(this.sharedTypesPath, 'utf8');
    
    // Extract interfaces and enums from TypeScript file
    const interfaces = {};
    const enums = {};
    
    // Extract interface definitions
    const interfaceMatches = content.matchAll(/export\s+interface\s+(\w+)\s*{([^}]+)}/g);
    for (const match of interfaceMatches) {
      const name = match[1];
      const fields = {};
      
      // Extract field definitions
      const fieldMatches = match[2].matchAll(/^\s*(\w+)\??:\s*([^;\n]+)/gm);
      for (const field of fieldMatches) {
        fields[field[1]] = field[2].trim();
      }
      
      interfaces[name] = fields;
    }
    
    // Extract enum definitions
    const enumMatches = content.matchAll(/export\s+type\s+(\w+)\s*=\s*([^;]+);/g);
    for (const match of enumMatches) {
      const name = match[1];
      const values = match[2].split('|').map(v => v.trim().replace(/'/g, ''));
      enums[name] = values;
    }
    
    return { interfaces, enums };
  }

  async getDatabaseSchema() {
    const client = await this.pool.connect();
    
    try {
      // Get all tables
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE '_%'
        ORDER BY table_name
      `);
      
      const tables = {};
      
      // Get columns for each table
      for (const row of tablesResult.rows) {
        const tableName = row.table_name;
        const columnsResult = await client.query(`
          SELECT 
            column_name, 
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            udt_name
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        tables[tableName] = columnsResult.rows.map(col => ({
          name: col.column_name,
          type: col.udt_name.replace(/^_/, ''), // Remove array prefix if present
          nullable: col.is_nullable === 'YES',
          defaultValue: col.column_default,
          maxLength: col.character_maximum_length
        }));
      }
      
      // Get enum types
      const enumsResult = await client.query(`
        SELECT t.typname as enum_name, e.enumlabel as enum_value
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnspace
        WHERE n.nspname = 'public'
        ORDER BY enum_name, e.enumsortorder
      `);
      
      const enums = {};
      for (const row of enumsResult.rows) {
        if (!enums[row.enum_name]) {
          enums[row.enum_name] = [];
        }
        enums[row.enum_name].push(row.enum_value);
      }
      
      return { tables, enums };
    } finally {
      client.release();
    }
  }

  validateTables(sharedTypes, dbSchema) {
    const { interfaces } = sharedTypes;
    const { tables } = dbSchema;
    
    // Check each interface has a corresponding table
    for (const [interfaceName, fields] of Object.entries(interfaces)) {
      const tableName = this.camelToSnake(interfaceName);
      
      if (!tables[tableName]) {
        this.errors.push(`Table '${tableName}' not found in database (for interface '${interfaceName}')`);
        continue;
      }
      
      // Check each field has a corresponding column
      const tableColumns = tables[tableName].reduce((acc, col) => {
        acc[col.name] = col;
        return acc;
      }, {});
      
      for (const [fieldName, fieldType] of Object.entries(fields)) {
        const columnName = this.camelToSnake(fieldName);
        
        if (!tableColumns[columnName]) {
          this.errors.push(`Column '${columnName}' not found in table '${tableName}' (for field '${fieldName}' in interface '${interfaceName}')`);
          continue;
        }
        
        // Check type compatibility
        const column = tableColumns[columnName];
        const expectedType = this.typescriptToPgType(fieldType);
        
        if (expectedType && !this.typesAreCompatible(expectedType, column.type)) {
          this.errors.push(
            `Type mismatch for '${tableName}.${columnName}': ` +
            `Expected '${expectedType}' but got '${column.type}'`
          );
        }
        
        // Check nullability
        const isOptional = fieldName.endsWith('?');
        if (!isOptional && column.nullable) {
          this.errors.push(
            `Nullability mismatch for '${tableName}.${columnName}': ` +
            `Field is required in TypeScript but nullable in database`
          );
        }
      }
    }
  }

  validateEnums(sharedTypes, dbSchema) {
    const { enums: sharedEnums } = sharedTypes;
    const { enums: dbEnums } = dbSchema;
    
    for (const [enumName, expectedValues] of Object.entries(sharedEnums)) {
      const pgEnumName = this.camelToSnake(enumName) + '_type';
      
      if (!dbEnums[pgEnumName]) {
        this.errors.push(`Enum '${pgEnumName}' not found in database (for TypeScript enum '${enumName}')`);
        continue;
      }
      
      const actualValues = dbEnums[pgEnumName];
      
      // Check all expected values exist in the database
      for (const value of expectedValues) {
        if (!actualValues.includes(value)) {
          this.errors.push(
            `Enum value '${value}' from TypeScript enum '${enumName}' ` +
            `not found in database enum '${pgEnumName}'`
          );
        }
      }
      
      // Check for extra values in the database
      for (const value of actualValues) {
        if (!expectedValues.includes(value)) {
          this.errors.push(
            `Unexpected enum value '${value}' in database enum '${pgEnumName}' ` +
            `(not in TypeScript enum '${enumName}')`
          );
        }
      }
    }
  }

  typescriptToPgType(tsType) {
    const typeMap = {
      'string': 'varchar',
      'number': 'int8',
      'boolean': 'bool',
      'Date': 'timestamptz',
    };
    
    // Handle optional types (ending with '?')
    if (tsType.endsWith('?')) {
      tsType = tsType.slice(0, -1).trim();
    }
    
    // Handle arrays (e.g., 'string[]')
    if (tsType.endsWith('[]')) {
      const baseType = tsType.slice(0, -2);
      return typeMap[baseType] ? `_${typeMap[baseType]}` : null;
    }
    
    return typeMap[tsType] || null;
  }
  
  typesAreCompatible(expectedType, actualType) {
    // Simple type compatibility check
    const typeEquivalents = {
      'varchar': ['text', 'character varying'],
      'int8': ['bigint', 'int8'],
      'timestamptz': ['timestamp with time zone', 'timestamptz'],
      'bool': ['boolean', 'bool'],
    };
    
    // Check direct match or equivalent types
    return expectedType === actualType || 
           (typeEquivalents[expectedType] && 
            typeEquivalents[expectedType].includes(actualType));
  }
  
  camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }
  
  reportResults() {
    if (this.errors.length === 0) {
      console.log('✅ Schema validation passed - Frontend and backend schemas are aligned!');
    } else {
      console.error('❌ Schema validation failed with the following issues:');
      this.errors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
      console.error('\nPlease fix the above issues to align your frontend and backend schemas.');
    }
  }
}

// Run the validator if this file is executed directly
if (require.main === module) {
  const validator = new SchemaValidator();
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = SchemaValidator;
