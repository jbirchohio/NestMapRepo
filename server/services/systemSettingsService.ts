import { db } from "../db-connection";
import { sql } from 'drizzle-orm';

// Cache for system settings
let settingsCache: Record<string, any> = {};
let cacheLastUpdated: Date | null = null;
const CACHE_TTL = 60000; // 1 minute

// Get all settings with caching
export async function getSystemSettings(): Promise<Record<string, any>> {
  if (cacheLastUpdated && Date.now() - cacheLastUpdated.getTime() < CACHE_TTL) {
    return settingsCache;
  }

  try {
    const result = await db.execute(sql`SELECT * FROM system_settings`);
    settingsCache = {};
    
    result.rows.forEach((row: any) => {
      const value = row.setting_type === 'number' ? Number(row.setting_value) :
                    row.setting_type === 'boolean' ? row.setting_value === 'true' :
                    row.setting_value;
      settingsCache[row.setting_key] = value;
    });
    
    cacheLastUpdated = new Date();
    return settingsCache;
  } catch (error: any) {
    // If table doesn't exist, return empty settings
    if (error.code === '42P01') {
      console.warn('⚠️  system_settings table does not exist, using default settings');
      settingsCache = {};
      cacheLastUpdated = new Date();
      return settingsCache;
    }
    throw error;
  }
}

// Get a specific setting
export async function getSetting(key: string): Promise<any> {
  const settings = await getSystemSettings();
  return settings[key];
}

// Update settings and apply changes
export async function updateSetting(key: string, value: any): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE system_settings 
      SET setting_value = ${String(value)}, updated_at = NOW()
      WHERE setting_key = ${key}
    `);
    
    // Invalidate cache
    cacheLastUpdated = null;
    
    // Apply setting changes immediately
    await applySettingChange(key, value);
  } catch (error: any) {
    if (error.code === '42P01') {
      console.warn('⚠️  Cannot update setting - system_settings table does not exist');
      return;
    }
    throw error;
  }
}

// Apply setting changes to the running system
async function applySettingChange(key: string, value: any) {
  switch (key) {
    // Security Settings
    case 'rate_limit_requests':
      // Update rate limit configuration
      process.env.RATE_LIMIT_REQUESTS = String(value);
      console.log(`Rate limit updated to ${value} requests per window`);
      break;
      
    case 'rate_limit_window':
      // Update rate limit window
      process.env.RATE_LIMIT_WINDOW = String(value);
      console.log(`Rate limit window updated to ${value} seconds`);
      break;
      
    case 'allowed_cors_origins':
      // Update CORS middleware dynamically
      const origins = value.split(',').map((o: string) => o.trim());
      process.env.ALLOWED_CORS_ORIGINS = value;
      break;
      
    case 'session_timeout':
      process.env.SESSION_TIMEOUT = String(value);
      break;
      
    // Platform Settings
    case 'enable_signups':
      process.env.ENABLE_SIGNUPS = String(value);
      break;
      
    case 'require_email_verification':
      process.env.REQUIRE_EMAIL_VERIFICATION = String(value);
      break;
      
    case 'default_trial_days':
      process.env.DEFAULT_TRIAL_DAYS = String(value);
      break;
      
    // Maintenance Settings
    case 'maintenance_mode':
      process.env.MAINTENANCE_MODE = String(value);
      break;
      
    case 'backup_enabled':
      if (value === 'true') {
        startBackupSchedule();
      } else {
        stopBackupSchedule();
      }
      break;
      
    // Performance Settings
    case 'cache_enabled':
      process.env.CACHE_ENABLED = String(value);
      break;
      
    case 'cache_ttl':
      process.env.CACHE_TTL = String(value);
      break;
      
    case 'max_upload_size_mb':
      process.env.MAX_UPLOAD_SIZE_MB = String(value);
      break;
      
    case 'database_pool_size':
      // This would require reconnecting to database with new pool size
      console.log(`Database pool size change to ${value} will take effect on next restart`);
      break;
  }
}

// Backup scheduling
let backupJob: NodeJS.Timeout | null = null;

function startBackupSchedule() {
  getSetting('backup_frequency').then(frequency => {
    const intervalMs = frequency === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000; // Daily or weekly
    
    if (backupJob) {
      clearInterval(backupJob);
    }
    
    // For demo purposes, we'll just log the backup action
    backupJob = setInterval(async () => {
      console.log('Scheduled backup would run here...');
      // In production, you would call: await backupDatabase();
    }, intervalMs);
    
    console.log(`Backup schedule started: ${frequency}`);
  });
}

export function stopBackupSchedule() {
  if (backupJob) {
    clearInterval(backupJob);
    backupJob = null;
    console.log('Backup schedule stopped');
  }
}

// Initialize settings on startup
export async function initializeSystemSettings() {
  const settings = await getSystemSettings();
  
  // Apply all settings
  for (const [key, value] of Object.entries(settings)) {
    await applySettingChange(key, value);
  }
  
  console.log('System settings initialized');
}

// Maintenance mode check middleware
export function checkMaintenanceMode(req: any, res: any, next: any) {
  getSetting('maintenance_mode').then(maintenanceMode => {
    if (maintenanceMode === true && !req.user?.role?.includes('superadmin')) {
      getSetting('maintenance_message').then(message => {
        res.status(503).json({ 
          error: 'Service Unavailable',
          message: message || 'System is under maintenance'
        });
      });
    } else {
      next();
    }
  }).catch(() => next());
}

// Get settings for frontend display
export function getSettingsForDisplay(settings: any[]): any[] {
  return settings.map(setting => ({
    ...setting,
    effectiveValue: settingsCache[setting.setting_key] || setting.setting_value,
    requiresRestart: ['database_pool_size', 'smtp_host', 'smtp_port'].includes(setting.setting_key)
  }));
}