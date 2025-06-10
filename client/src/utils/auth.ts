import { User } from '@/types/jwt';

// Account lockout state
interface AccountLockout {
  attempts: number;
  lockedUntil: number;
}

// Account lockout settings
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Local storage keys
const LOCKOUT_KEY = 'account_lockout';
const LAST_LOGIN_KEY = 'last_login';

// Get stored lockout state
const getLockoutState = (): AccountLockout | null => {
  const state = localStorage.getItem(LOCKOUT_KEY);
  return state ? JSON.parse(state) : null;
};

// Set lockout state
const setLockoutState = (state: AccountLockout): void => {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
};

// Clear lockout state
const clearLockoutState = (): void => {
  localStorage.removeItem(LOCKOUT_KEY);
};

// Check if account is locked
export const isAccountLocked = (email: string): boolean => {
  const lockout = getLockoutState();
  if (!lockout) return false;
  
  const now = Date.now();
  return lockout.lockedUntil > now;
};

// Set account lockout
export const setAccountLockout = (email: string): void => {
  const now = Date.now();
  const lockout: AccountLockout = {
    attempts: MAX_LOGIN_ATTEMPTS,
    lockedUntil: now + LOCKOUT_DURATION
  };
  setLockoutState(lockout);
};

// Increment login attempts
export const incrementLoginAttempts = (email: string): void => {
  const lockout = getLockoutState() || { attempts: 0, lockedUntil: 0 };
  lockout.attempts += 1;
  
  if (lockout.attempts >= MAX_LOGIN_ATTEMPTS) {
    lockout.lockedUntil = Date.now() + LOCKOUT_DURATION;
  }
  
  setLockoutState(lockout);
};

// Reset login attempts
export const resetLoginAttempts = (email: string): void => {
  clearLockoutState();
};

// Get login attempts
export const getLoginAttempts = (email: string): number => {
  const lockout = getLockoutState();
  return lockout ? lockout.attempts : 0;
};

// Get lockout time remaining
export const getLockoutTimeRemaining = (email: string): number => {
  const lockout = getLockoutState();
  if (!lockout) return 0;
  
  const now = Date.now();
  return Math.max(0, lockout.lockedUntil - now);
};

// Validate password strength
export const validatePassword = (password: string): boolean => {
  const requirements = {
    minLength: 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  return (
    password.length >= requirements.minLength &&
    requirements.hasUpperCase &&
    requirements.hasLowerCase &&
    requirements.hasNumber &&
    requirements.hasSpecialChar
  );
};
