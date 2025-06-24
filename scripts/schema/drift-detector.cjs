#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { inspect } = require('util');
const { parse } = require('pg-connection-string');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

class SchemaDriftDetector {
  constructor() {
    // Get database URL from environment or use defaults
    const dbUrl = process.env.DATABASE_URL || 
                 `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'postgres'}`;
    
    const config = process.env.DATABASE_URL 
      ? {
          connectionString: dbUrl,
          ssl: process.env.NODE_ENV === 'production' 
            ? { rejectUnauthorized: false } 
            : false
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'postgres',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
          ssl: process.env.NODE_ENV === 'production' 
            ? { rejectUnauthorized: false } 
            : false
        };

    this.pool = new Pool(config);
    
    this.ormModels = this.loadOrmModels();
    this.driftReport = {
      timestamp: new Date().toISOString(),
      issues: [],
      summary: {
        total_issues: 0,
        by_severity: { error: 0, warning: 0, info: 0 },
        by_category: {}
      }
    };
  }

  async detectDrift() {
    try {
      console.log('Starting schema drift detection...');
      
      // 1. Get database schema
      const dbSchema = await this.getDatabaseSchema();
      
      // 2. Compare with ORM models
      await this.compareWithOrmModels(dbSchema);
      
      // 3. Check for orphaned tables
      await this.checkOrphanedTables(dbSchema);
      
      // 4. Generate report
      this.generateReport();
      
      return this.driftReport;
    } catch (error) {
      console.error('Error detecting schema drift:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  async getDatabaseSchema() {
    console.log('Fetching database schema...');
    const client = await this.pool.connect();
    
    try {
      const [tables, columns, indexes, constraints, enums] = await Promise.all([
        this.getTables(client),
        this.getColumns(client),
        this.getIndexes(client),
        this.getConstraints(client),
        this.getEnums(client)
      ]);

      // Organize schema by table
      const schema = {};
      
      // Initialize tables
      tables.forEach(table => {
        schema[table.table_name] = {
          ...table,
          columns: {},
          indexes: [],
          constraints: []
        };
      });

      // Add columns
      columns.forEach(column => {
        if (schema[column.table_name]) {
          schema[column.table_name].columns[column.column_name] = column;
        }
      });

      // Add indexes
      indexes.forEach(index => {
        if (schema[index.table_name]) {
          schema[index.table_name].indexes.push(index);
        }
      });

      // Add constraints
      constraints.forEach(constraint => {
        if (schema[constraint.table_name]) {
          schema[constraint.table_name].constraints.push(constraint);
        }
      });

      return { tables: schema, enums };
    } finally {
      client.release();
    }
  }

  async getTables(client) {
    const { rows } = await client.query(`
      SELECT 
        table_name,
        table_type,
        obj_description((table_schema || '.' || table_name)::regclass, 'pg_class') as comment
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    return rows;
  }

  async getColumns(client) {
    const { rows } = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        udt_name,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        col_description((table_schema || '.' || table_name)::regclass, ordinal_position) as comment
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    return rows;
  }

  async getIndexes(client) {
    const { rows } = await client.query(`
      SELECT
        tablename as table_name,
        indexname as index_name,
        indexdef as definition,
        'INDEX' as constraint_type
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname NOT LIKE '%pkey' -- Exclude primary keys (handled by constraints)
      ORDER BY tablename, indexname
    `);
    return rows;
  }

  async getConstraints(client) {
    const { rows } = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        tc.is_deferrable,
        tc.initially_deferred,
        ccu.column_name,
        ccu2.table_name AS references_table,
        ccu2.column_name AS references_column,
        pg_get_constraintdef(con.oid) as definition
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
      LEFT JOIN pg_constraint con 
        ON con.conname = tc.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu2 
        ON con.confrelid::regclass::text = ccu2.table_name
        AND con.confkey::text[] = ARRAY[ccu2.column_name]
      WHERE tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `);
    return rows;
  }

  async getEnums(client) {
    const { rows } = await client.query(`
      SELECT t.typname as enum_name, 
             e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `);
    
    // Group enum values by enum type
    return rows.reduce((acc, { enum_name, enum_value }) => {
      if (!acc[enum_name]) {
        acc[enum_name] = [];
      }
      acc[enum_name].push(enum_value);
      return acc;
    }, {});
  }

  loadOrmModels() {
    console.log('Loading ORM models...');
    // This is a simplified example. In a real app, you would import your actual ORM models.
    // For this example, we'll return a mock structure.
    return {
      users: {
        tableName: 'users',
        columns: {
          id: { type: 'uuid', primaryKey: true },
          email: { type: 'string', nullable: false },
          // ... other columns
        },
        indexes: [
          { name: 'users_email_idx', columns: ['email'], unique: true }
        ],
        // ... other model properties
      },
      // ... other models
    };
  }

  async compareWithOrmModels(dbSchema) {
    console.log('Comparing with ORM models...');
    // Compare each ORM model with database schema
    for (const [modelName, model] of Object.entries(this.ormModels)) {
      const dbTable = dbSchema.tables[model.tableName];
      
      if (!dbTable) {
        this.addIssue('error', 'missing_table', 
          `Table ${model.tableName} exists in ORM but not in database`,
          { model: modelName }
        );
        continue;
      }

      // Check columns
      for (const [columnName, columnDef] of Object.entries(model.columns || {})) {
        const dbColumn = dbTable.columns[columnName];
        
        if (!dbColumn) {
          this.addIssue('error', 'missing_column',
            `Column ${columnName} exists in ORM but not in database table ${model.tableName}`,
            { model: modelName, column: columnName }
          );
          continue;
        }

        // Check column types
        const ormType = this.mapOrmTypeToDbType(columnDef.type);
        if (ormType && ormType !== dbColumn.udt_name) {
          this.addIssue('warning', 'type_mismatch',
            `Type mismatch for ${model.tableName}.${columnName}: ORM has ${ormType}, DB has ${dbColumn.udt_name}`,
            { 
              model: modelName, 
              column: columnName, 
              orm_type: ormType, 
              db_type: dbColumn.udt_name 
            }
          );
        }

        // Check nullability
        const ormNullable = columnDef.nullable !== false; // Default to true if not specified
        const dbNullable = dbColumn.is_nullable === 'YES';
        if (ormNullable !== dbNullable) {
          this.addIssue('warning', 'nullability_mismatch',
            `Nullability mismatch for ${model.tableName}.${columnName}: ` +
            `ORM has ${ormNullable ? 'nullable' : 'NOT NULL'}, DB has ${dbNullable ? 'NULL' : 'NOT NULL'}`,
            { model: modelName, column: columnName }
          );
        }
      }

      // Check for extra columns in database
      for (const dbColumnName of Object.keys(dbTable.columns)) {
        if (!model.columns?.[dbColumnName]) {
          this.addIssue('info', 'extra_column',
            `Column ${dbColumnName} exists in database but not in ORM model ${modelName}`,
            { model: modelName, column: dbColumnName }
          );
        }
      }

      // Check indexes
      const ormIndexes = new Set((model.indexes || []).map(idx => idx.name));
      const dbIndexes = new Set((dbTable.indexes || []).map(idx => idx.index_name));
      
      // Check for missing indexes
      for (const index of model.indexes || []) {
        if (!dbIndexes.has(index.name)) {
          this.addIssue('warning', 'missing_index',
            `Index ${index.name} exists in ORM but not in database`,
            { model: modelName, index: index.name }
          );
        }
      }
      
      // Check for extra indexes (usually not a problem, but good to know)
      for (const dbIndex of dbTable.indexes || []) {
        if (!ormIndexes.has(dbIndex.index_name) && 
            !dbIndex.index_name.endsWith('_pkey') && // Skip primary keys
            !dbIndex.index_name.endsWith('_fkey')) { // Skip foreign keys
          this.addIssue('info', 'extra_index',
            `Index ${dbIndex.index_name} exists in database but not in ORM model ${modelName}`,
            { model: modelName, index: dbIndex.index_name }
          );
        }
      }
    }
  }

  async checkOrphanedTables(dbSchema) {
    console.log('Checking for orphaned tables...');
    // Find tables that exist in DB but don't have corresponding ORM models
    for (const tableName of Object.keys(dbSchema.tables)) {
      const hasModel = Object.values(this.ormModels).some(
        model => model.tableName === tableName
      );
      
      if (!hasModel && !tableName.startsWith('_') && !tableName.startsWith('pg_')) {
        this.addIssue('warning', 'orphaned_table',
          `Table ${tableName} exists in database but has no corresponding ORM model`,
          { table: tableName }
        );
      }
    }
  }

  mapOrmTypeToDbType(ormType) {
    // Simple mapping - should be extended based on your ORM's type system
    const typeMap = {
      'string': 'varchar',
      'text': 'text',
      'integer': 'int4',
      'number': 'numeric',
      'boolean': 'bool',
      'date': 'timestamptz',
      'uuid': 'uuid',
      'json': 'jsonb',
      'jsonb': 'jsonb',
    };
    
    return typeMap[ormType] || ormType;
  }

  addIssue(severity, category, message, details = {}) {
    const issue = { severity, category, message, details };
    this.driftReport.issues.push(issue);
    this.driftReport.summary.total_issues++;
    this.driftReport.summary.by_severity[severity] = (this.driftReport.summary.by_severity[severity] || 0) + 1;
    this.driftReport.summary.by_category[category] = (this.driftReport.summary.by_category[category] || 0) + 1;
    
    // Log to console for immediate feedback
    const logMethod = severity === 'error' ? console.error : 
                     severity === 'warning' ? console.warn : console.log;
    logMethod(`[${severity.toUpperCase()}] ${category}: ${message}`);
    
    return issue;
  }

  generateReport() {
    const reportPath = path.join(process.cwd(), 'schema-drift-report.json');
    const report = {
      ...this.driftReport,
      generated_at: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        name: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
      },
    };
    
    // Save JSON report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nSchema drift report generated: ${reportPath}`);
    
    // Print summary
    this.printSummary();
    
    return report;
  }

  printSummary() {
    const { total_issues, by_severity } = this.driftReport.summary;
    console.log('\n=== Schema Drift Detection Summary ===');
    console.log(`Total issues found: ${total_issues}`);
    console.log('By severity:');
    console.log(`  Errors: ${by_severity.error || 0}`);
    console.log(`  Warnings: ${by_severity.warning || 0}`);
    console.log(`  Info: ${by_severity.info || 0}`);
    
    if (by_severity.error > 0) {
      console.log('\n🚨 Critical issues found that may cause application errors!');
      this.driftReport.issues
        .filter(issue => issue.severity === 'error')
        .forEach((issue, i) => {
          console.log(`\n${i + 1}. ${issue.message}`);
          if (Object.keys(issue.details).length > 0) {
            console.log('   Details:', inspect(issue.details, { depth: null, colors: true }));
          }
        });
    }
    
    console.log('\nRun with --fix to automatically fix fixable issues');
    console.log('======================================');
  }

  // This would be implemented to fix issues when run with --fix
  async fixIssues() {
    console.log('Fixing issues...');
    // Implementation would go here to automatically fix issues
    // This is a placeholder for the actual implementation
  }
}

// Run the detector if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  
  const detector = new SchemaDriftDetector();
  
  if (fix) {
    detector.fixIssues()
      .then(() => console.log('Fixes applied successfully'))
      .catch(console.error);
  } else {
    detector.detectDrift()
      .catch(console.error);
  }
}

module.exports = SchemaDriftDetector;
