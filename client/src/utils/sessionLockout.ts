import { SecureCookie } from './SecureCookie.js';
export interface SessionLockoutConfig {
    maxAttempts: number;
    lockoutDuration: number; // in milliseconds
    attemptWindow: number; // in milliseconds
}
export class SessionLockout {
    private static instance: SessionLockout;
    private attempts: Map<string, {
        count: number;
        timestamp: number;
    }>;
    private lockouts: Map<string, {
        timestamp: number;
    }>;
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
    }
    public static getInstance(config?: SessionLockoutConfig): SessionLockout {
        if (!SessionLockout.instance) {
            SessionLockout.instance = new SessionLockout(config);
        }
        return SessionLockout.instance;
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
        }
        else {
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
        if (!lockout)
            return false;
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
        // Store lockout in secure storage
        SecureCookie.set(`lockout_${key}`, now.toString(), {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/',
            maxAge: this.config.lockoutDuration / 1000
        });
    }
    /**
     * Unlock an account
     * @param key IP address or user ID
     */
    public unlockAccount(key: string): void {
        if (this.lockouts.has(key)) {
            this.lockouts.delete(key);
            SecureCookie.remove(`lockout_${key}`);
        }
    }
    /**
     * Clear all lockouts
     */
    public clearAllLockouts(): void {
        this.lockouts.forEach((_, key) => {
            this.unlockAccount(key);
        });
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
            remainingTime = Math.max(0, this.config.lockoutDuration - (Date.now() - lockout.timestamp));
        }
        return {
            isLocked: !!lockout,
            remainingTime,
            attempts: attempt.count
        };
    }
}
