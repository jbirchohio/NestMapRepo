import { User } from '@prisma/client';

export type AuthUser = User & {
    organizationId?: string | null;
};
export interface JwtUser {
    id: string;
    email: string;
    role: string;
    organization_id: string | null;
    tokenType: 'access' | 'refresh';
}
export interface ApiResponse<T = unknown> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
    error?: {
        code?: string;
        message: string;
        details?: unknown;
    };
}
export interface LoginResponse {
    user: {
        id: number;
        email: string;
        username: string;
        firstName: string | null;
        lastName: string | null;
        role: string;
        organizationId: number | null;
    };
    tokens: {
        accessToken: string;
        refreshToken?: string;
    };
}
export interface RegisterInput {
    email: string;
    password: string;
    username: string;
    firstName?: string | null;
    lastName?: string | null;
    organizationName: string;
}
export interface LoginInput {
    email: string;
    password: string;
    rememberMe?: boolean;
}
