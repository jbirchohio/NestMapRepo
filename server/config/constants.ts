/**
 * Application constants
 * This file contains all the constants used throughout the application
 */
// Authentication
// ==============
/**
 * Number of salt rounds for bcrypt password hashing
 * Higher is more secure but slower
 */
export const SALT_ROUNDS = 10;
/**
 * Token expiration times
 */
export const TOKEN_EXPIRY = {
    ACCESS: '15m', // 15 minutes
    REFRESH: '7d', // 7 days
    PASSWORD_RESET: '1h', // 1 hour
    EMAIL_VERIFICATION: '24h', // 24 hours
} as const;
/**
 * User roles and permissions
 */
export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    MANAGER: 'manager',
    MEMBER: 'member',
    GUEST: 'guest',
} as const;
/**
 * Default pagination values
 */
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
} as const;
/**
 * Cache TTL in seconds
 */
export const CACHE_TTL = {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 1 day
} as const;
/**
 * Rate limiting configuration
 */
export const RATE_LIMIT = {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100, // Limit each IP to 100 requests per windowMs
} as const;
/**
 * File upload limits
 */
export const UPLOAD_LIMITS = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FILES: 5,
    ALLOWED_FILE_TYPES: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
} as const;
/**
 * Validation constants
 */
export const VALIDATION = {
    PASSWORD: {
        MIN_LENGTH: 8,
        MAX_LENGTH: 100,
        REQUIRE_NUMBER: true,
        REQUIRE_UPPERCASE: true,
        REQUIRE_LOWERCASE: true,
        REQUIRE_SYMBOL: true,
    },
    USERNAME: {
        MIN_LENGTH: 3,
        MAX_LENGTH: 30,
        ALLOWED_CHARS: /^[a-zA-Z0-9_.-]+$/,
    },
    EMAIL: {
        MAX_LENGTH: 255,
    },
} as const;
