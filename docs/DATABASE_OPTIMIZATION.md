# Database Optimization Report

## 1. Normalization Review

### Current Schema Assessment

#### Tables with Potential Normalization Issues:

1. **Users Table**
   - ✅ Well-normalized with separate authentication data
   - ✅ Proper use of foreign keys
   - ⚠️ `metadata` JSONB field could be normalized further if specific fields are frequently queried

2. **Organizations Table**
   - ✅ Good separation of billing and core data
   - ⚠️ Consider splitting `settings` and `metadata` into separate tables if they contain structured, queryable data

3. **Trips Table**
   - ✅ Good use of foreign keys
   - ⚠️ Consider normalizing `destination` into a separate locations table if location-based queries are common
   - ⚠️ `status` could be an enum type for better data integrity

4. **Card Transactions**
   - ✅ Well-normalized with proper relationships
   - ✅ Good use of JSONB for variable transaction details

### Recommended Normalization Improvements

1. **Create a Separate Locations Table**
   ```sql
   CREATE TABLE locations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     address TEXT,
     city TEXT,
     state TEXT,
     country TEXT,
     postal_code TEXT,
     latitude DECIMAL(10, 8),
     longitude DECIMAL(11, 8),
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   ```

2. **Normalize Transaction Categories**
   ```sql
   CREATE TABLE transaction_categories (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     description TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   ```

## 2. Indexing Strategy

### Current Indexes
- Primary keys (implicitly indexed)
- Foreign keys (implicitly indexed in PostgreSQL)
- Manually added indexes on common query patterns

### Recommended Additional Indexes

1. **Partial Indexes for Soft Deletes**
   ```sql
   CREATE INDEX idx_users_active ON users(id) WHERE is_active = true;
   CREATE INDEX idx_organizations_active ON organizations(id) WHERE status = 'active';
   ```

2. **Composite Indexes for Common Queries**
   ```sql
   -- For date-range queries on trips
   CREATE INDEX idx_trips_date_range ON trips(organization_id, start_date, end_date);
   
   -- For user activity queries
   CREATE INDEX idx_activities_user_date ON activities(user_id, start_time);
   ```

3. **GIN Indexes for JSONB Fields**
   ```sql
   -- If querying specific fields within JSONB
   CREATE INDEX idx_users_metadata_gin ON users USING GIN (metadata);
   CREATE INDEX idx_organizations_settings_gin ON organizations USING GIN (settings);
   ```

## 3. Referential Integrity

### Current State
- Foreign key constraints are properly defined
- ON DELETE behaviors are set appropriately
- CASCADE operations are used where appropriate

### Recommendations
1. Add CHECK constraints for status fields
   ```sql
   ALTER TABLE trips 
   ADD CONSTRAINT check_trip_status 
   CHECK (status IN ('draft', 'planned', 'in_progress', 'completed', 'cancelled'));
   ```

2. Add validation for email formats
   ```sql
   ALTER TABLE users 
   ADD CONSTRAINT valid_email 
   CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');
   ```

## 4. Monitoring Setup

### Database Metrics to Monitor
1. **Query Performance**
   - Slow queries (> 100ms)
   - Sequential scans on large tables
   - Missing index suggestions

2. **Resource Usage**
   - Connection pool utilization
   - Cache hit ratio
   - Table/index bloat

3. **Replication Lag** (if using replication)

### Recommended Monitoring Tools
1. **pg_stat_statements** for query performance
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   ```

2. **pgBadger** for log analysis
   ```bash
   # In postgresql.conf
   shared_preload_libraries = 'pg_stat_statements'
   pg_stat_statements.track = all
   ```

3. **Prometheus + Grafana** for visualization
   - Use `postgres_exporter` to collect metrics
   - Set up alerts for critical metrics

## 5. Documentation

### Schema Documentation
- Document all tables, columns, and relationships
- Include sample queries for common operations
- Document data retention policies

### Runbook
- Backup/restore procedures
- Performance troubleshooting guide
- Common maintenance tasks (VACUUM, REINDEX, etc.)

## Implementation Plan

1. **Immediate Actions**
   - Add missing indexes (30 mins)
   - Set up basic monitoring (1 hour)
   - Document current schema (ongoing)

2. **Short-term (Next Sprint)**
   - Implement location normalization
   - Add CHECK constraints
   - Set up automated monitoring alerts

3. **Long-term**
   - Consider read replicas for reporting
   - Implement partitioning for large tables
   - Set up continuous schema validation
