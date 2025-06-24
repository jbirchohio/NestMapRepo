// Token prefixes for Redis keys
export const TOKEN_BLACKLIST_PREFIX = 'jti_blacklist:';
export const REFRESH_TOKEN_PREFIX = 'refresh_token:';
// Token expiration times (in seconds as strings for jsonwebtoken)
export const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRES_IN || '15m'; // 15 minutes
export const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // 7 days
export const PASSWORD_RESET_EXPIRY = process.env.JWT_PASSWORD_RESET_EXPIRES_IN || '1h'; // 1 hour
export const EMAIL_VERIFICATION_EXPIRY = process.env.JWT_EMAIL_VERIFICATION_EXPIRES_IN || '24h'; // 24 hours
