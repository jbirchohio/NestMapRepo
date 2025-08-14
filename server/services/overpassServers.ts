/**
 * Multiple Overpass API servers to distribute load and avoid rate limiting
 */
import { logger } from '../utils/logger';

export const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter'
];

class OverpassServerManager {
  private currentIndex = 0;
  private serverHealth: Map<string, { failures: number; lastFailure: number }> = new Map();
  private readonly FAILURE_THRESHOLD = 3;
  private readonly COOLDOWN_TIME = 5 * 60 * 1000; // 5 minutes

  /**
   * Get the next available Overpass server
   */
  getNextServer(): string {
    const availableServers = this.getAvailableServers();
    
    if (availableServers.length === 0) {
      // All servers are down, reset and try again
      logger.warn('[OverpassServers] All servers in cooldown, resetting...');
      this.serverHealth.clear();
      return OVERPASS_SERVERS[0];
    }

    // Round-robin through available servers
    const server = availableServers[this.currentIndex % availableServers.length];
    this.currentIndex++;
    
    return server;
  }

  /**
   * Get servers that are not in cooldown
   */
  private getAvailableServers(): string[] {
    const now = Date.now();
    
    return OVERPASS_SERVERS.filter(server => {
      const health = this.serverHealth.get(server);
      
      if (!health) {
        return true; // Server hasn't failed yet
      }
      
      // Check if server is in cooldown
      if (health.failures >= this.FAILURE_THRESHOLD) {
        if (now - health.lastFailure > this.COOLDOWN_TIME) {
          // Cooldown expired, reset server
          this.serverHealth.delete(server);
          logger.info(`[OverpassServers] Server ${server} recovered from cooldown`);
          return true;
        }
        return false; // Still in cooldown
      }
      
      return true; // Not enough failures for cooldown
    });
  }

  /**
   * Report a server failure
   */
  reportFailure(server: string): void {
    const health = this.serverHealth.get(server) || { failures: 0, lastFailure: 0 };
    health.failures++;
    health.lastFailure = Date.now();
    this.serverHealth.set(server, health);
    
    logger.warn(`[OverpassServers] Server ${server} failed (${health.failures} failures)`);
    
    if (health.failures >= this.FAILURE_THRESHOLD) {
      logger.error(`[OverpassServers] Server ${server} exceeded failure threshold, entering cooldown`);
    }
  }

  /**
   * Report a server success (reduces failure count)
   */
  reportSuccess(server: string): void {
    const health = this.serverHealth.get(server);
    
    if (health && health.failures > 0) {
      health.failures = Math.max(0, health.failures - 1);
      this.serverHealth.set(server, health);
      logger.info(`[OverpassServers] Server ${server} success (${health.failures} failures remaining)`);
    }
  }

  /**
   * Get server health statistics
   */
  getStats() {
    return {
      servers: OVERPASS_SERVERS.map(server => {
        const health = this.serverHealth.get(server);
        return {
          url: server,
          failures: health?.failures || 0,
          inCooldown: health && health.failures >= this.FAILURE_THRESHOLD && 
                      Date.now() - health.lastFailure < this.COOLDOWN_TIME
        };
      })
    };
  }
}

export const overpassManager = new OverpassServerManager();

/**
 * Helper function for backward compatibility
 */
export function getNextOverpassServer(): string {
  return overpassManager.getNextServer();
}