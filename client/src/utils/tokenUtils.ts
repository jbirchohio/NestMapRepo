import { SecureCookie } from './SecureCookie';

// Token revocation list
const revokedTokens = new Set<string>();

/**
 * Adds a token to the revocation list
 * @param token The token to revoke
 */
export const revokeToken = (token: string): void => {
  revokedTokens.add(token);
};

/**
 * Checks if a token has been revoked
 * @param token The token to check
 * @returns true if token is revoked, false otherwise
 */
export const isTokenRevoked = (token: string): boolean => {
  return revokedTokens.has(token);
};

/**
 * Cleans up revoked tokens that are older than 24 hours
 */
export const cleanupRevokedTokens = (): void => {
  const now = Date.now();
  const tokensToRemove = Array.from(revokedTokens).filter(token => {
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return now - (decoded.iat * 1000) > 24 * 60 * 60 * 1000;
    } catch {
      return true; // Remove invalid tokens
    }
  });
  
  tokensToRemove.forEach(token => revokedTokens.delete(token));
};

// Start cleanup interval
setInterval(cleanupRevokedTokens, 60 * 60 * 1000); // Run every hour
