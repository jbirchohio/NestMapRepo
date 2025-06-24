#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

class DatabaseMonitor {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    
    this.metricsDir = process.env.METRICS_DIR || path.join(__dirname, '../../metrics');
    this.historyFile = path.join(this.metricsDir, 'db_metrics_history.json');
    this.initialize();
  }

  async initialize() {
    // Ensure metrics directory exists
    if (!fs.existsSync(this.metricsDir)) {
      fs.mkdirSync(this.metricsDir, { recursive: true });
    }
    
    // Initialize history file if it doesn't exist
    if (!fs.existsSync(this.historyFile)) {
      await writeFile(this.historyFile, JSON.stringify([], null, 2));
    }
  }

  async collectMetrics() {
    const client = await this.pool.connect();
    try {
      const [
        dbSize,
        activeConnections,
        cacheHitRatio,
        indexUsage,
        longRunningQueries,
        locks,
        replicationStatus,
        tableStats,
        indexStats,
        vacuumStats,
      ] = await Promise.all([
        this.getDatabaseSize(client),
        this.getActiveConnections(client),
        this.getCacheHitRatio(client),
        this.getIndexUsage(client),
        this.getLongRunningQueries(client),
        this.getLocks(client),
        this.getReplicationStatus(client),
        this.getTableStats(client),
        this.getIndexStats(client),
        this.getVacuumStats(client),
      ]);

      const metrics = {
        timestamp: new Date().toISOString(),
        database: {
          size: dbSize,
          active_connections: activeConnections,
          cache_hit_ratio: cacheHitRatio,
          replication: replicationStatus,
        },
        performance: {
          index_usage: indexUsage,
          long_running_queries: longRunningQueries,
          locks,
        },
        maintenance: {
          table_stats: tableStats,
          index_stats: indexStats,
          vacuum_stats: vacuumStats,
        },
      };

      await this.saveMetrics(metrics);
      return metrics;
    } finally {
      client.release();
    }
  }

  async saveMetrics(metrics) {
    try {
      // Read existing history
      const history = JSON.parse(await readFile(this.historyFile, 'utf8'));
      
      // Add new metrics and keep only last 1000 entries
      history.push(metrics);
      const trimmedHistory = history.slice(-1000);
      
      // Save back to file
      await writeFile(this.historyFile, JSON.stringify(trimmedHistory, null, 2));
      
      // Also save current metrics to a separate file for easy access
      await writeFile(
        path.join(this.metricsDir, 'db_metrics_current.json'),
        JSON.stringify(metrics, null, 2)
      );
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  }

  async getDatabaseSize(client) {
    const { rows } = await client.query(
      `SELECT 
         pg_size_pretty(pg_database_size(current_database())) as size,
         pg_database_size(current_database()) as bytes`
    );
    return rows[0];
  }

  async getActiveConnections(client) {
    const { rows } = await client.query(
      `SELECT 
         count(*) as total,
         count(*) FILTER (WHERE state = 'active') as active,
         count(*) FILTER (WHERE state = 'idle') as idle,
         count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
       FROM pg_stat_activity
       WHERE datname = current_database()`
    );
    return rows[0];
  }

  async getCacheHitRatio(client) {
    const { rows } = await client.query(
      `SELECT 
         sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
       FROM pg_statio_user_tables`
    );
    return rows[0]?.ratio || 0;
  }

  async getIndexUsage(client) {
    const { rows } = await client.query(
      `SELECT 
         schemaname as schema,
         relname as table,
         idx_scan as index_scans,
         seq_scan as seq_scans,
         n_live_tup as live_rows,
         n_dead_tup as dead_rows
       FROM pg_stat_user_tables
       ORDER BY n_dead_tup DESC`
    );
    return rows;
  }

  async getLongRunningQueries(client, thresholdMs = 1000) {
    const { rows } = await client.query(
      `SELECT 
         pid,
         now() - query_start as duration,
         query,
         state,
         wait_event_type,
         wait_event
       FROM pg_stat_activity
       WHERE now() - query_start > $1 * interval '1 millisecond'
         AND state != 'idle'
         AND pid != pg_backend_pid()
       ORDER BY duration DESC`,
      [thresholdMs]
    );
    return rows;
  }

  async getLocks(client) {
    const { rows } = await client.query(
      `SELECT 
         locktype,
         relation::regclass,
         mode,
         transactionid,
         virtualtransaction,
         pid,
         page,
         tuple,
         virtualxid
       FROM pg_locks
       WHERE pid != pg_backend_pid()`
    );
    return rows;
  }

  async getReplicationStatus(client) {
    try {
      const { rows } = await client.query(
        `SELECT 
           application_name,
           state,
           sent_lsn,
           write_lsn,
           flush_lsn,
           replay_lsn,
           write_lag,
           flush_lag,
           replay_lag,
           sync_priority,
           sync_state
         FROM pg_stat_replication`
      );
      return rows;
    } catch (error) {
      // Replication might not be configured
      return { error: 'Replication not configured', details: error.message };
    }
  }

  async getTableStats(client) {
    const { rows } = await client.query(
      `SELECT 
         schemaname as schema,
         relname as table,
         n_live_tup as live_rows,
         n_dead_tup as dead_rows,
         n_tup_ins as inserts,
         n_tup_upd as updates,
         n_tup_del as deletes,
         n_tup_hot_upd as hot_updates,
         last_vacuum,
         last_autovacuum,
         last_analyze,
         last_autoanalyze,
         vacuum_count,
         autovacuum_count,
         analyze_count,
         autoanalyze_count
       FROM pg_stat_user_tables
       ORDER BY n_dead_tup DESC`
    );
    return rows;
  }

  async getIndexStats(client) {
    const { rows } = await client.query(
      `SELECT 
         schemaname as schema,
         relname as table,
         indexrelname as index,
         idx_scan as scans,
         idx_tup_read as tuples_read,
         idx_tup_fetch as tuples_fetched,
         pg_size_pretty(pg_relation_size(indexrelid)) as size
       FROM pg_stat_user_indexes
       ORDER BY pg_relation_size(indexrelid) DESC`
    );
    return rows;
  }

  async getVacuumStats(client) {
    const { rows } = await client.query(
      `WITH table_opts AS (
         SELECT
           pg_class.oid, relname, nspname, array_to_string(reloptions, '') as relopts
         FROM
            pg_class INNER JOIN pg_namespace ns ON relnamespace = ns.oid
      ), vacuum_settings AS (
         SELECT
           oid, relname, nspname,
           CASE
             WHEN relopts LIKE '%autovacuum_vacuum_threshold%'
             THEN regexp_replace(relopts, '.*autovacuum_vacuum_threshold=([0-9.]+).*', E'\\\\1')::integer
             ELSE current_setting('autovacuum_vacuum_threshold')::integer
           END as autovacuum_vacuum_threshold,
           CASE
             WHEN relopts LIKE '%autovacuum_vacuum_scale_factor%'
             THEN regexp_replace(relopts, '.*autovacuum_vacuum_scale_factor=([0-9.]+).*', E'\\\\1')::real
             ELSE current_setting('autovacuum_vacuum_scale_factor')::real
           END as autovacuum_vacuum_scale_factor,
           CASE
             WHEN relopts LIKE '%autovacuum_analyze_threshold%'
             THEN regexp_replace(relopts, '.*autovacuum_analyze_threshold=([0-9.]+).*', E'\\\\1')::integer
             ELSE current_setting('autovacuum_analyze_threshold')::integer
           END as autovacuum_analyze_threshold,
           CASE
             WHEN relopts LIKE '%autovacuum_analyze_scale_factor%'
             THEN regexp_replace(relopts, '.*autovacuum_analyze_scale_factor=([0-9.]+).*', E'\\\\1')::real
             ELSE current_setting('autovacuum_analyze_scale_factor')::real
           END as autovacuum_analyze_scale_factor
         FROM
           table_opts
      )
      SELECT
        vacuum_settings.nspname as schema,
        vacuum_settings.relname as table,
        to_char(psut.last_vacuum, 'YYYY-MM-DD HH24:MI') as last_vacuum,
        to_char(psut.last_autovacuum, 'YYYY-MM-DD HH24:MI') as last_autovacuum,
        to_char(psut.last_analyze, 'YYYY-MM-DD HH24:MI') as last_analyze,
        to_char(psut.last_autoanalyze, 'YYYY-MM-DD HH24:MI') as last_autoanalyze,
        to_char(pg_class.reltuples, '999,999,999,999') as rowcount,
        to_char(psut.n_dead_tup, '999,999,999,999') as dead_rowcount,
        to_char(autovacuum_vacuum_threshold
             + (autovacuum_vacuum_scale_factor::numeric * pg_class.reltuples), '999,999,999,999') as autovacuum_threshold,
        CASE
          WHEN autovacuum_vacuum_threshold + (autovacuum_vacuum_scale_factor::numeric * pg_class.reltuples) < psut.n_dead_tup
          THEN 'NEEDS VACUUM'
          ELSE 'OK'
        END as needs_vacuum,
        to_char(autovacuum_analyze_threshold
             + (autovacuum_analyze_scale_factor::numeric * pg_class.reltuples), '999,999,999,999') as analyze_threshold,
        CASE
          WHEN autovacuum_analyze_threshold + (autovacuum_analyze_scale_factor::numeric * pg_class.reltuples) < 
               psut.n_dead_tup
          THEN 'NEEDS ANALYZE'
          ELSE 'OK'
        END as needs_analyze
      FROM
        pg_stat_user_tables psut
        JOIN pg_class on psut.relid = pg_class.oid
        JOIN vacuum_settings ON pg_class.oid = vacuum_settings.oid
      ORDER BY psut.n_dead_tup DESC`
    );
    return rows;
  }

  async close() {
    await this.pool.end();
  }
}

// Run the monitor if this file is executed directly
if (require.main === module) {
  const monitor = new DatabaseMonitor();
  
  const collectAndLog = async () => {
    try {
      console.log('Collecting database metrics...');
      const metrics = await monitor.collectMetrics();
      console.log('Metrics collected at:', metrics.timestamp);
      
      // Check for critical conditions
      if (metrics.database.cache_hit_ratio < 0.9) {
        console.warn(`⚠️  Low cache hit ratio: ${(metrics.database.cache_hit_ratio * 100).toFixed(2)}%`);
      }
      
      const longRunningQueries = metrics.performance.long_running_queries;
      if (longRunningQueries.length > 0) {
        console.warn(`⚠️  ${longRunningQueries.length} long running queries detected`);
      }
      
      const locks = metrics.performance.locks;
      if (locks.length > 10) {
        console.warn(`⚠️  High number of locks detected: ${locks.length}`);
      }
      
      // Check for tables that need vacuum
      const needsVacuum = metrics.maintenance.vacuum_stats.filter(t => t.needs_vacuum === 'NEEDS VACUUM');
      if (needsVacuum.length > 0) {
        console.warn(`⚠️  ${needsVacuum.length} tables need VACUUM`);
      }
      
    } catch (error) {
      console.error('Error collecting metrics:', error);
    } finally {
      await monitor.close();
    }
  };
  
  collectAndLog().catch(console.error);
}

module.exports = DatabaseMonitor;
