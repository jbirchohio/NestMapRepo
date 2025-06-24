# Schema & ORM Drift Management

## Overview

This document outlines the strategy and tools for managing schema and ORM drift in the NestMap application. Schema drift occurs when the database schema and the application's ORM models become out of sync, which can lead to runtime errors and data inconsistencies.

## Tools

### 1. Schema Drift Detector

**Location**: `scripts/schema/drift-detector.js`

Detects differences between your database schema and ORM models.

**Usage**:
```bash
# Check for drift
node scripts/schema/drift-detector.js

# Generate a detailed report
node scripts/schema/drift-detector.js > drift-report.json

# Run with auto-fix (when available)
node scripts/schema/drift-detector.js --fix
```

**What it checks**:
- Missing tables/columns in database
- Extra tables/columns in database
- Type mismatches
- Missing or extra indexes
- Constraint differences
- Orphaned tables (in DB but not in ORM)

### 2. Schema Synchronizer

**Location**: `scripts/schema/sync-schema.js`

Helps synchronize the database schema with ORM models by generating and applying migrations.

**Usage**:
```bash
# Generate and run migrations
node scripts/schema/sync-schema.js
```

**Features**:
- Generates timestamped migrations
- Runs pending migrations
- Validates schema consistency
- Integrates with existing migration system

## Common Drift Scenarios

### 1. Adding a New Model/Table

1. Define the model in your ORM
2. Generate a migration:
   ```bash
   node scripts/schema/sync-schema.js
   ```
3. Review the generated migration
4. Commit both model and migration files

### 2. Modifying an Existing Model

1. Update the ORM model definition
2. Generate a migration:
   ```bash
   node scripts/schema/sync-schema.js
   ```
3. Test the migration in a development environment
4. Commit both changes together

### 3. Detecting Drift in Production

1. Run the drift detector:
   ```bash
   NODE_ENV=production node scripts/schema/drift-detector.js
   ```
2. Review the report
3. Create and test migrations to fix any issues
4. Apply changes during a maintenance window

## Best Practices

### 1. Version Control
- Always commit migration files with the corresponding model changes
- Never modify migrations after they've been applied to production
- Use descriptive migration names

### 2. Development Workflow
1. Make model changes
2. Generate migration
3. Test locally
4. Commit both model and migration
5. Open PR for review

### 3. Code Review
- Review both model changes and migrations together
- Pay special attention to data migration logic
- Verify rollback procedures

### 4. Deployment
- Run migrations before deploying code changes
- Have a rollback plan
- Monitor after deployment

## Troubleshooting

### Common Issues

#### 1. Migration Fails
- **Symptom**: Migration fails with an error
- **Solution**:
  ```bash
  # Check the error message
  # Fix the migration or database state
  # Rollback if needed
  npx db-migrate down
  ```

#### 2. Schema Drift Detected
- **Symptom**: Drift detector reports inconsistencies
- **Solution**:
  ```bash
  # Generate a migration to fix the drift
  node scripts/schema/sync-schema.js
  # Review and test the migration
  ```

#### 3. Missing Tables/Columns
- **Symptom**: Application errors about missing tables or columns
- **Solution**:
  ```bash
  # Check for pending migrations
  npx db-migrate status
  # Run migrations if needed
  npx db-migrate up
  ```

## Monitoring

### 1. Automated Checks
Add a pre-commit hook to check for schema drift:

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run drift detection
DRIFT_REPORT=$(node scripts/schema/drift-detector.js --json)
if [ $? -ne 0 ]; then
  echo "❌ Schema drift detected. Please fix before committing."
  echo "$DRIFT_REPORT"
  exit 1
fi

exit 0
```

### 2. CI/CD Pipeline
Add a drift check to your CI pipeline:

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  check-schema:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Check for schema drift
        run: node scripts/schema/drift-detector.js
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: test_db
          DB_USER: postgres
          DB_PASSWORD: postgres
```

## Recovery Procedures

### 1. Failed Migration
1. Rollback the failed migration:
   ```bash
   npx db-migrate down
   ```
2. Fix the migration file
3. Test locally
4. Commit the fix
5. Redeploy

### 2. Data Corruption
1. Restore from backup
2. Identify the root cause
3. Create a fix
4. Test thoroughly
5. Deploy fix

## Team Responsibilities

### Developers
- Keep models and schema in sync
- Write tests for migrations
- Document schema changes

### DBAs
- Monitor database performance
- Review migration impact
- Handle production migrations

### DevOps
- Ensure backup/restore procedures work
- Monitor database health
- Handle deployment of migrations

## Appendix

### Migration Templates

#### Adding a Table
```javascript
// migrations/YYYYMMDDHHMMSS_add_table_name.js
'use strict';

module.exports = {
  up: async function(db) {
    await db.createTable('table_name', {
      id: { type: 'uuid', primaryKey: true, notNull: true, defaultValue: new String('gen_random_uuid()') },
      created_at: { type: 'timestamp with time zone', notNull: true, defaultValue: new String('now()') },
      updated_at: { type: 'timestamp with time zone', notNull: true, defaultValue: new String('now()') },
      // Add other columns here
    });
    
    // Add indexes
    await db.addIndex('table_name', 'idx_table_name_column', ['column_name']);
  },

  down: async function(db) {
    await db.dropTable('table_name');
  }
};
```

#### Adding a Column
```javascript
// migrations/YYYYMMDDHHMMSS_add_column_to_table.js
'use strict';

module.exports = {
  up: async function(db) {
    await db.addColumn('table_name', 'column_name', {
      type: 'data_type',
      notNull: false, // Set to true if adding a required column with a default
      defaultValue: 'default_value' // Only for non-null columns
    });
    
    // For required columns, update existing rows first if needed
    // await db.runSql('UPDATE table_name SET column_name = ? WHERE column_name IS NULL', ['default_value']);
    // await db.changeColumn('table_name', 'column_name', { notNull: true });
  },

  down: async function(db) {
    await db.removeColumn('table_name', 'column_name');
  }
};
```

### Recommended Reading
- [Database Migrations Best Practices](https://www.prisma.io/dataguide/types/relational/migrations)
- [Managing Schema Drift](https://martinfowler.com/articles/evodb.html)
- [PostgreSQL Schema Management](https://www.postgresql.org/docs/current/ddl.html)
