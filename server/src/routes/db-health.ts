import { Router } from 'express';
import { pool } from '../db-connection';
import type { PoolClient } from 'pg';

const router = Router();

/**
 * @route GET /api/health/db
 * @description Database health check endpoint
 * @access Public
 */
router.get('/db', async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      status: 'error',
      database: 'connection_failed',
      message: 'Database pool is not initialized',
    });
  }

  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      currentTime: result.rows[0].current_time as string,
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(503).json({
      status: 'error',
      database: 'connection_failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

export default router;
