// Type definitions for auth module

/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Please use the shared types from '@shared/schema/types/auth' instead.
 */

export const AUTH_TOKEN_KEY: string;

export function getAuthToken(): string | null;
export function setAuthToken(token: string): void;
export function removeAuthToken(): void;
export function isAuthenticated(): boolean;
