import { SecureCookie } from './SecureCookie';

// Token revocation list
// Load revoked tokens from secure cookie storage
const revokedTokens = new Set<string>();
const storedRevoked = SecureCookie.get('revoked_tokens');
if (storedRevoked) {
  try {
    const tokens: string[] = JSON.parse(storedRevoked);
    tokens.forEach(token => revokedTokens.add(token));
  } catch {
    SecureCookie.remove('revoked_tokens');
  }
}

/**
 * Adds a token to the revocation list
 * @param token The token to revoke
 */
export const revokeToken = (token: string): void => {
  revokedTokens.add(token);
  SecureCookie.set('revoked_tokens', JSON.stringify(Array.from(revokedTokens)));
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

  SecureCookie.set('revoked_tokens', JSON.stringify(Array.from(revokedTokens)));
};

// Start cleanup interval
setInterval(cleanupRevokedTokens, 60 * 60 * 1000); // Run every hour
