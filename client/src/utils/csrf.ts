import { SecureCookie } from './SecureCookie';

const CSRF_TOKEN_NAME = 'csrf_token';
const CSRF_TOKEN_HEADER = 'X-CSRF-Token';

// Generate a cryptographically secure random token
export const generateCSRFToken = (): string => {
  if (!window.crypto) {
    throw new Error('Crypto API not available');
  }
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

// Set CSRF token with secure options
export const setCSRFToken = (): void => {
  const token = generateCSRFToken();
  SecureCookie.set(CSRF_TOKEN_NAME, token, {
    path: '/',
    secure: true,
    httpOnly: false, // CSRF token needs to be accessible to JavaScript
    sameSite: 'strict',
    maxAge: 3600 // 1 hour
  });
};

// Get CSRF token from cookie
export const getCSRFToken = (): string => {
  const token = SecureCookie.get(CSRF_TOKEN_NAME);
  if (!token) {
    setCSRFToken();
    return SecureCookie.get(CSRF_TOKEN_NAME) || '';
  }
  return token;
};

// Clear CSRF token
export const clearCSRFToken = (): void => {
  SecureCookie.remove(CSRF_TOKEN_NAME);
};

// Validate CSRF token
export const validateCSRFToken = (token: string): boolean => {
  const dToken = getCSRFToken();
  return token === dToken;
};

// Initialize CSRF token when app starts
setCSRFToken();

// Export types
export type CSRFToken = string;
export interface CSRFTokenOptions {
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
}
