// Type definitions for auth module

export const AUTH_TOKEN_KEY: string;

export function getAuthToken(): string | null;
export function setAuthToken(token: string): void;
export function removeAuthToken(): void;
export function isAuthenticated(): boolean;
