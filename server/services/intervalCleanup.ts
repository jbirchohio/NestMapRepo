import { logger } from '../utils/logger';

/**
 * Interval cleanup service to prevent memory leaks
 * Tracks all intervals and ensures proper cleanup
 */

interface TrackedInterval {
  id: NodeJS.Timeout;
  name: string;
  created: Date;
  interval: number;
}

class IntervalCleanupService {
  private intervals: Map<string, TrackedInterval> = new Map();
  private globalIntervals: Set<NodeJS.Timeout> = new Set();

  /**
   * Create and track a new interval
   */
  setInterval(
    callback: () => void,
    interval: number,
    name: string
  ): NodeJS.Timeout {
    // Clear existing interval with same name if exists
    if (this.intervals.has(name)) {
      this.clearInterval(name);
      logger.warn(`Replacing existing interval: ${name}`);
    }

    const id = setInterval(() => {
      try {
        callback();
      } catch (error) {
        logger.error(`Error in interval ${name}:`, error);
      }
    }, interval);

    const tracked: TrackedInterval = {
      id,
      name,
      created: new Date(),
      interval
    };

    this.intervals.set(name, tracked);
    this.globalIntervals.add(id);

    logger.debug(`Created interval: ${name} (${interval}ms)`);
    return id;
  }

  /**
   * Clear a specific interval by name
   */
  clearInterval(name: string): boolean {
    const tracked = this.intervals.get(name);
    if (!tracked) {
      logger.warn(`Interval not found: ${name}`);
      return false;
    }

    clearInterval(tracked.id);
    this.intervals.delete(name);
    this.globalIntervals.delete(tracked.id);

    logger.debug(`Cleared interval: ${name}`);
    return true;
  }

  /**
   * Clear all intervals
   */
  clearAll(): number {
    const count = this.intervals.size;

    for (const [name, tracked] of this.intervals) {
      clearInterval(tracked.id);
      logger.debug(`Clearing interval: ${name}`);
    }

    // Also clear any untracked intervals
    for (const id of this.globalIntervals) {
      clearInterval(id);
    }

    this.intervals.clear();
    this.globalIntervals.clear();

    logger.info(`Cleared ${count} intervals`);
    return count;
  }

  /**
   * Get information about all active intervals
   */
  getActiveIntervals(): Array<{
    name: string;
    interval: number;
    running: number;
    created: string;
  }> {
    const now = Date.now();

    return Array.from(this.intervals.entries()).map(([name, tracked]) => ({
      name,
      interval: tracked.interval,
      running: Math.floor((now - tracked.created.getTime()) / 1000),
      created: tracked.created.toISOString()
    }));
  }

  /**
   * Clean up intervals older than specified age
   */
  cleanupOldIntervals(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [name, tracked] of this.intervals) {
      const age = now - tracked.created.getTime();
      if (age > maxAgeMs) {
        this.clearInterval(name);
        cleaned++;
        logger.info(`Cleaned up old interval: ${name} (age: ${Math.floor(age / 1000)}s)`);
      }
    }

    return cleaned;
  }

  /**
   * Monitor for potential memory leaks
   */
  startMonitoring(checkIntervalMs: number = 60000): void {
    this.setInterval(() => {
      const active = this.intervals.size;

      if (active > 50) {
        logger.warn(`High number of active intervals: ${active}`, {
          intervals: this.getActiveIntervals()
        });
      }

      // Clean up very old intervals (older than 24 hours)
      const cleaned = this.cleanupOldIntervals(24 * 60 * 60 * 1000);
      if (cleaned > 0) {
        logger.info(`Cleaned up ${cleaned} old intervals`);
      }

      // Check for memory usage
      if (global.gc) {
        global.gc();
      }

      const memUsage = process.memoryUsage();
      if (memUsage.heapUsed > 400 * 1024 * 1024) { // 400MB threshold
        logger.warn('High memory usage detected', {
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          activeIntervals: active
        });
      }
    }, checkIntervalMs, 'interval-monitor');
  }

  /**
   * Replace global setInterval to track all intervals
   */
  monkeyPatchGlobalInterval(): void {
    const originalSetInterval = global.setInterval;
    const self = this;

    (global as any).setInterval = function(
      callback: any,
      interval: number,
      ...args: any[]
    ): NodeJS.Timeout {
      const id = originalSetInterval(callback, interval, ...args);
      self.globalIntervals.add(id);

      // Wrap clearInterval to remove from tracking
      const originalClear = global.clearInterval;
      (global as any).clearInterval = function(id: NodeJS.Timeout) {
        self.globalIntervals.delete(id);
        return originalClear(id);
      };

      return id;
    };

    logger.info('Global interval tracking enabled');
  }
}

// Singleton instance
export const intervalCleanup = new IntervalCleanupService();

// Clean up on process exit
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, cleaning up intervals');
  intervalCleanup.clearAll();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, cleaning up intervals');
  intervalCleanup.clearAll();
});

process.on('beforeExit', () => {
  intervalCleanup.clearAll();
});

// Export convenience functions
export const safeSetInterval = intervalCleanup.setInterval.bind(intervalCleanup);
export const safeClearInterval = intervalCleanup.clearInterval.bind(intervalCleanup);
export const clearAllIntervals = intervalCleanup.clearAll.bind(intervalCleanup);
export const getActiveIntervals = intervalCleanup.getActiveIntervals.bind(intervalCleanup);