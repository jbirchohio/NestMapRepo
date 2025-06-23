const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
export const isAccountLocked = (email: string): boolean => {
    const lockoutTime = localStorage.getItem(`lockout_${email}`);
    if (!lockoutTime)
        return false;
    const now = Date.now();
    return now < parseInt(lockoutTime);
};
export const getLockoutTimeRemaining = (email: string): number => {
    const lockoutTime = localStorage.getItem(`lockout_${email}`);
    if (!lockoutTime)
        return 0;
    const now = Date.now();
    return Math.max(0, parseInt(lockoutTime) - now);
};
export const resetLoginAttempts = (email: string): void => {
    localStorage.removeItem(`login_attempts_${email}`);
    localStorage.removeItem(`lockout_${email}`);
};
export const incrementLoginAttempts = (email: string): number => {
    const attempts = localStorage.getItem(`login_attempts_${email}`);
    const currentAttempts = attempts ? parseInt(attempts) : 0;
    const newAttempts = currentAttempts + 1;
    localStorage.setItem(`login_attempts_${email}`, newAttempts.toString());
    return newAttempts;
};
export const setAccountLockout = (email: string): void => {
    const lockoutTime = Date.now() + LOGIN_LOCKOUT_TIME;
    localStorage.setItem(`lockout_${email}`, lockoutTime.toString());
};
export const getLoginAttempts = (email: string): number => {
    const attempts = localStorage.getItem(`login_attempts_${email}`);
    return attempts ? parseInt(attempts) : 0;
};
