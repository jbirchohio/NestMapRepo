# Database Maintenance Guide

## Table of Contents
- [Monitoring](#monitoring)
- [Backup and Recovery](#backup-and-recovery)
- [Performance Tuning](#performance-tuning)
- [Scheduled Maintenance](#scheduled-maintenance)
- [Troubleshooting](#troubleshooting)

## Monitoring

### Setup

1. **Prerequisites**
   - Node.js installed
   - PostgreSQL client tools (`pg_dump`, `psql`)
   - Administrative access to schedule tasks

2. **Install Monitoring**
   ```powershell
   # Run as Administrator
   .\scripts\setup-monitoring.ps1
   ```

   This will:
   - Create a scheduled task that runs every 5 minutes
   - Store metrics in the `metrics/` directory
   - Set up weekly log rotation

### Metrics Collected

- **Database Size**: Current size and growth over time
- **Connection Pool**: Active/idle connections
- **Cache Hit Ratio**: Query performance indicator
- **Long Running Queries**: Queries taking >1s
- **Table Statistics**: Row counts, dead tuples
- **Index Usage**: Identify unused indexes
- **Vacuum Statistics**: Track autovacuum performance

### Viewing Metrics

1. **Current Metrics**
   ```bash
   # View latest metrics
   cat metrics/db_metrics_current.json | jq .
   ```

2. **Historical Trends**
   ```bash
   # Install jq if needed: choco install jq
   cat metrics/db_metrics_history.json | jq '.[] | {timestamp, database: .database.size.bytes, cache_ratio: .database.cache_hit_ratio}'
   ```

## Backup and Recovery

### Automated Backups

1. **Setup**
   ```powershell
   # Run as Administrator
   .\scripts\setup-backup-task.ps1
   ```

   This will:
   - Create daily backups at 2 AM
   - Keep backups for 30 days
   - Compress backups to save space

2. **Manual Backup**
   ```bash
   node scripts/database/backup.js
   ```

### Restoring from Backup

1. **Full Restore**
   ```bash
   node scripts/database/backup.js --restore path/to/backup.sql.gz
   ```

2. **Partial Restore**
   ```bash
   # Extract the backup
   gunzip -c backup.sql.gz > backup.sql
   
   # Restore specific tables
   pg_restore -t users -t organizations backup.sql -d your_database
   ```

## Performance Tuning

### Index Management

1. **Add Missing Indexes**
   ```sql
   -- Example: Add index for common query
   CREATE INDEX idx_trips_org_date ON trips(organization_id, start_date);
   ```

2. **Find Unused Indexes**
   ```sql
   SELECT 
     schemaname || '.' || relname as table,
     indexrelname as index,
     pg_size_pretty(pg_relation_size(i.indexrelid)) as size,
     idx_scan as scans
   FROM pg_stat_user_indexes i
   JOIN pg_index USING (indexrelid)
   WHERE idx_scan < 50  -- Fewer than 50 scans
     AND NOT indisunique  -- Not a unique constraint
   ORDER BY pg_relation_size(i.indexrelid) DESC;
   ```

### Query Optimization

1. **Find Slow Queries**
   ```sql
   SELECT 
     query,
     calls,
     total_exec_time,
     rows,
     100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) as hit_percent
   FROM pg_stat_statements 
   ORDER BY total_exec_time DESC 
   LIMIT 10;
   ```

2. **Explain Analyze**
   ```sql
   EXPLAIN ANALYZE 
   SELECT * FROM users WHERE email = 'user@example.com';
   ```

## Scheduled Maintenance

### Vacuum and Analyze

1. **Manual Vacuum**
   ```sql
   -- Full vacuum (locks table)
   VACUUM FULL ANALYZE verbose table_name;
   
   -- Analyze without locking
   ANALYZE verbose table_name;
   ```

2. **Monitor Autovacuum**
   ```sql
   SELECT 
     relname,
     last_vacuum,
     last_autovacuum,
     last_analyze,
     last_autoanalyze,
     n_dead_tup
   FROM pg_stat_user_tables;
   ```

### Index Rebuilding

```sql
-- Rebuild an index
REINDEX INDEX index_name;

-- Rebuild all indexes in a schema
REINDEX SCHEMA public;
```

## Troubleshooting

### Common Issues

1. **Connection Pool Full**
   ```sql
   -- Find idle connections
   SELECT * FROM pg_stat_activity 
   WHERE state = 'idle' 
   AND now() - state_change > interval '5 minutes';
   
   -- Terminate idle connections
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state = 'idle' 
   AND pid <> pg_backend_pid();
   ```

2. **Long Running Queries**
   ```sql
   -- Find and cancel long running queries
   SELECT pid, now() - query_start as duration, query 
   FROM pg_stat_activity 
   WHERE state = 'active' 
   AND now() - query_start > interval '5 minutes';
   
   -- Cancel query
   SELECT pg_cancel_backend(pid);
   ```

3. **Lock Contention**
   ```sql
   -- Find locks
   SELECT blocked_locks.pid AS blocked_pid,
          blocking_locks.pid AS blocking_pid,
          blocked_activity.usename AS blocked_user,
          blocking_activity.usename AS blocking_user,
          blocked_activity.query AS blocked_statement,
          blocking_activity.query AS blocking_statement
   FROM pg_catalog.pg_locks blocked_locks
   JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
   JOIN pg_catalog.pg_locks blocking_locks 
        ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid = blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
   JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
   WHERE NOT blocked_locks.GRANTED;
   ```

## Maintenance Window Procedures

### Before Maintenance
1. Notify users of scheduled downtime
2. Take a full backup
3. Document current performance metrics

### During Maintenance
1. Perform one change at a time
2. Test after each change
3. Document all changes

### After Maintenance
1. Verify all services are running
2. Check for any errors in logs
3. Monitor performance metrics
4. Update documentation

## Emergency Contacts

- **Database Administrator**: [Name] - [Phone] - [Email]
- **On-call Engineer**: [Name] - [Phone] - [Email]
- **Escalation Path**: [Process Description]
