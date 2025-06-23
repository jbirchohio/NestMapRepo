import { JwtPayload as BaseJwtPayload } from 'jsonwebtoken';
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'member' | 'guest';
export type TokenType = 'access' | 'refresh' | 'password_reset';
// Extend JwtPayload but override the role to be required
interface CustomJwtPayload extends Omit<BaseJwtPayload, 'role'> {
    role: UserRole;
}
export interface TokenPayload extends CustomJwtPayload {
    sub: string;
    email: string;
    jti: string;
    type: TokenType;
    organizationId?: string;
}
export interface TokenVerificationResult<T = TokenPayload> {
    valid: boolean;
    payload?: T;
    error?: string;
    expired?: boolean;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}
export interface JwtConfig {
    secret: string;
    issuer: string;
    audience: string;
    accessExpiresIn: string | number;
    refreshExpiresIn: string | number;
    passwordResetExpiresIn: string | number;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
}
