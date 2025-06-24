#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { camelCase } = require('lodash');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

class TypeGenerator {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'nestmap',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    
    this.outputPath = path.join(__dirname, '../shared/types/generated/database.gen.ts');
    this.enums = {};
    this.tables = {};
  }

  async generate() {
    console.log('🔍 Generating TypeScript types from database...');
    
    try {
      // 1. Get database schema
      await this.loadSchema();
      
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
    } finally {
      await this.pool.end();
    }
  }

  async loadSchema() {
    const client = await this.pool.connect();
    
    try {
      // Load enums first
      await this.loadEnums(client);
      
      // Then load tables and their columns
      await this.loadTables(client);
    } finally {
      client.release();
    }
  }

  async loadEnums(client) {
    // Get all enum types
    const enumTypes = await client.query(`
      SELECT t.typname as enum_name
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnspace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
    `);
    
    // Get values for each enum
    for (const { enum_name } of enumTypes.rows) {
      const values = await client.query(
        `SELECT enumlabel as value 
         FROM pg_enum 
         JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
         WHERE pg_type.typname = $1 
         ORDER BY enumsortorder`,
        [enum_name]
      );
      
      this.enums[enum_name] = values.rows.map(row => row.value);
    }
  }

  async loadTables(client) {
    // Get all tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT LIKE '_%'
      ORDER BY table_name
    `);
    
    // Get columns for each table
    for (const { table_name } of tables.rows) {
      const columns = await client.query(
        `SELECT 
           column_name, 
           data_type,
           udt_name,
           is_nullable,
           column_default
         FROM information_schema.columns 
         WHERE table_name = $1
         ORDER BY ordinal_position`,
        [table_name]
      );
      
      this.tables[table_name] = columns.rows.map(column => ({
        name: column.column_name,
        type: column.udt_name,
        isNullable: column.is_nullable === 'YES',
        hasDefault: !!column.column_default
      }));
    }
  }

  generateTypeScript() {
    let output = '// AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY\n';
    output += '// This file is generated automatically from the database schema\n\n';
    
    // Generate enums
    output += '// Enums\n';
    for (const [enumName, values] of Object.entries(this.enums)) {
      const tsEnumName = this.snakeToPascal(enumName.replace(/_type$/, ''));
      output += `export type ${tsEnumName} = ${values.map(v => `'${v}'`).join(' | ')};\n`;
      output += `export const ${tsEnumName}Values = [${values.map(v => `'${v}'`).join(', ')}] as const;\n\n`;
    }
    
    // Generate interfaces
    output += '// Tables\n';
    for (const [tableName, columns] of Object.entries(this.tables)) {
      const interfaceName = this.snakeToPascal(tableName);
      
      output += `export interface ${interfaceName} {\n`;
      
      for (const column of columns) {
        const tsType = this.pgToTsType(column.type, column.isNullable);
        const optional = column.isNullable || column.hasDefault ? '?' : '';
        
        output += `  ${this.snakeToCamel(column.name)}${optional}: ${tsType};\n`;
      }
      
      output += '}\n\n';
    }
    
    // Generate input types (for create/update operations)
    output += '// Input types (for create/update operations)\n';
    for (const [tableName, columns] of Object.entries(this.tables)) {
      const interfaceName = this.snakeToPascal(tableName);
      const inputName = `${interfaceName}Input`;
      
      output += `export interface ${inputName} {\n`;
      
      for (const column of columns) {
        // Skip auto-generated fields
        if (['id', 'created_at', 'updated_at'].includes(column.name)) {
          continue;
        }
        
        const tsType = this.pgToTsType(column.type, true); // Make all input fields optional
        output += `  ${this.snakeToCamel(column.name)}?: ${tsType};\n`;
      }
      
      output += '}\n\n';
    }
    
    return output;
  }

  pgToTsType(pgType, isNullable) {
    // Handle array types (e.g., _varchar -> string[])
    if (pgType.startsWith('_')) {
      const elementType = this.pgToTsType(pgType.slice(1), false);
      return isNullable ? `${elementType}[] | null` : `${elementType}[]`;
    }
    
    // Handle enum types (end with _type)
    if (pgType.endsWith('_type') && this.enums[pgType]) {
      const enumName = this.snakeToPascal(pgType.replace(/_type$/, ''));
      return isNullable ? `${enumName} | null` : enumName;
    }
    
    // Map PostgreSQL types to TypeScript types
    const typeMap = {
      'varchar': 'string',
      'text': 'string',
      'int4': 'number',
      'int8': 'number',
      'float8': 'number',
      'bool': 'boolean',
      'timestamptz': 'Date',
      'timestamp': 'Date',
      'date': 'Date',
      'jsonb': 'Record<string, any>',
      'json': 'Record<string, any>',
      'uuid': 'string',
    };
    
    const tsType = typeMap[pgType] || 'any';
    return isNullable ? `${tsType} | null` : tsType;
  }

  snakeToCamel(str) {
    return str.split('_').map((part, i) => 
      i === 0 ? part : part[0].toUpperCase() + part.slice(1)
    ).join('');
  }
  
  snakeToPascal(str) {
    return str.split('_').map(part => 
      part[0].toUpperCase() + part.slice(1)
    ).join('');
  }
}

// Run the generator if this file is executed directly
if (require.main === module) {
  const generator = new TypeGenerator();
  generator.generate().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = TypeGenerator;
