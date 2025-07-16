
// Using localStorage instead of SecureCookie for NextAuth compatibility

export interface SessionLockoutConfig {
  maxAttempts: number;
  lockoutDuration: number; // in milliseconds
  attemptWindow: number; // in milliseconds
}

export class SessionLockout {
  private static instance: SessionLockout;
  private attempts: Map<string, { count: number; timestamp: number }>;
  private lockouts: Map<string, { timestamp: number }>;
  private config: SessionLockoutConfig;

  private constructor(config?: SessionLockoutConfig) {
    this.attempts = new Map();
    this.lockouts = new Map();
    this.config = {
      maxAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      attemptWindow: 15 * 60 * 1000, // 15 minutes
      ...config
    };
    this.loadAttemptsFromStorage();
  }

  public static getInstance(config?: SessionLockoutConfig): SessionLockout {
    if (!SessionLockout.instance) {
      SessionLockout.instance = new SessionLockout(config);
    }
    return SessionLockout.instance;
  }
  
  /**
   * Initialize the session lockout by loading data from storage
   */
  public initialize(): void {
    this.loadAttemptsFromStorage();
  }

  /**
   * Record a failed login attempt
   * @param ip IP address of the attempt
   * @param userId User ID if available
   */
  public recordFailedAttempt(ip: string, userId?: string): void {
    const key = userId || ip;
    const now = Date.now();
    
    // Check if already locked out
    if (this.isLockedOut(key)) {
      return;
    }

    // Get existing attempt count
    const attempt = this.attempts.get(key) || { count: 0, timestamp: now };
    
    // Reset count if window has expired
    if (now - attempt.timestamp > this.config.attemptWindow) {
      attempt.count = 1;
      attempt.timestamp = now;
    } else {
      attempt.count++;
    }

    this.attempts.set(key, attempt);

    // Check if lockout is needed
    if (attempt.count >= this.config.maxAttempts) {
      this.lockoutAccount(key);
    }
  }

  /**
   * Check if an account is locked out
   * @param key IP address or user ID
   * @returns boolean indicating if locked out
   */
  public isLockedOut(key: string): boolean {
    const lockout = this.lockouts.get(key);
    if (!lockout) return false;

    const now = Date.now();
    if (now - lockout.timestamp > this.config.lockoutDuration) {
      this.unlockAccount(key);
      return false;
    }

    return true;
  }

  /**
   * Lock out an account
   * @param key IP address or user ID
   */
  private lockoutAccount(key: string): void {
    const now = Date.now();
    this.lockouts.set(key, { timestamp: now });
    this.saveAttemptsToStorage();
  }

  /**
   * Unlock an account
   * @param key IP address or user ID
   */
  public unlockAccount(key: string): void {
    if (this.lockouts.has(key)) {
      this.lockouts.delete(key);
      this.saveAttemptsToStorage();
    }
  }

  /**
   * Clear all lockouts
   */
  public clearAllLockouts(): void {
    this.lockouts.forEach((_, key) => {
      this.unlockAccount(key);
    });
    this.clearLockouts();
  }

  /**
   * Get lockout status
   * @param key IP address or user ID
   * @returns Object with lockout status
   */
  public getLockoutStatus(key: string): {
    isLocked: boolean;
    remainingTime: number;
    attempts: number;
  } {
    const lockout = this.lockouts.get(key);
    const attempt = this.attempts.get(key) || { count: 0, timestamp: Date.now() };
    
    let remainingTime = 0;
    if (lockout) {
      remainingTime = Math.max(0, 
        this.config.lockoutDuration - (Date.now() - lockout.timestamp)
      );
    }

    return {
      isLocked: !!lockout,
      remainingTime,
      attempts: attempt.count
    };
  }

  private saveAttemptsToStorage(): void {
    try {
      const attemptsObj: Record<string, { count: number; timestamp: number }> = {};
      this.attempts.forEach((value, key) => {
        attemptsObj[key] = value;
      });

      const lockoutsObj: Record<string, { timestamp: number }> = {};
      this.lockouts.forEach((value, key) => {
        lockoutsObj[key] = value;
      });

      localStorage.setItem('login_attempts', JSON.stringify(attemptsObj));
      localStorage.setItem('login_lockouts', JSON.stringify(lockoutsObj));
    } catch (error) {
      console.error('Failed to save login attempts to storage:', error);
    }
  }

  private loadAttemptsFromStorage(): void {
    try {
      const storedAttempts = localStorage.getItem('login_attempts');
      if (storedAttempts) {
        const parsed = JSON.parse(storedAttempts);
        Object.entries(parsed).forEach(([key, value]) => {
          this.attempts.set(key, value as { count: number; timestamp: number });
        });
      }

      const storedLockouts = localStorage.getItem('login_lockouts');
      if (storedLockouts) {
        const parsed = JSON.parse(storedLockouts);
        Object.entries(parsed).forEach(([key, value]) => {
          this.lockouts.set(key, value as { timestamp: number });
        });
      }
    } catch (error) {
      console.error('Failed to load login attempts from storage:', error);
    }
  }

  public clearLockouts(): void {
    this.lockouts.clear();
    localStorage.removeItem('login_lockouts');
  }
}
