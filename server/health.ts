import { Request, Response } from "express";
import { pool } from "./db-connection";

/**
 * Standard health check handler that works across all platforms
 * Used by cloud providers to verify application health
 */
export async function healthCheck(req: Request, res: Response) {
  try {
    // Check database connection
    const dbResult = await pool.query("SELECT 1");
    const dbConnected = dbResult.rowCount === 1;
    
    // Basic application information
    const healthInfo = {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      database: {
        connected: dbConnected
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
    
    return res.status(200).json(healthInfo);
  } catch (error) {
    console.error("Health check failed:", error);
    
    return res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      message: "Health check failed"
    });
  }
}