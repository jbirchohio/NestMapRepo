export interface SecurityContext {
    headers: Record<string, string>;
    session: {
        valid: boolean;
        userId: string | null;
    } | null;
    token: {
        valid: boolean;
        userId: string | null;
    } | null;
    errors: Error[];
}
export interface SanitizedError {
    message: string;
    code: string;
    type: string;
}
export interface SessionDetails {
    sessionId: string | null;
    userId: string | null;
    userAgent: string | null;
    ip: string | null;
    sessionAge: number;
    sessionTimeout: number;
}
import { AxiosHeaderValue } from 'axios';
export interface SecurityHeaders {
    [key: string]: AxiosHeaderValue;
    'Content-Security-Policy': AxiosHeaderValue;
    'X-Content-Type-Options': AxiosHeaderValue;
    'X-Frame-Options': AxiosHeaderValue;
    'X-XSS-Protection': AxiosHeaderValue;
    'Referrer-Policy': AxiosHeaderValue;
}
