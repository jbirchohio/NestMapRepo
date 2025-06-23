// User-related types
export interface User {
    id: number;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
    role: string;
    organizationId?: string;
    permissions: string[];
    avatarUrl?: string;
    isEmailVerified?: boolean;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
}
// JWT Payload
export interface JwtPayload {
    sub: string; // User ID
    email: string;
    name: string;
    role: string;
    organization_id: string;
    permissions: string[];
    exp: number;
    iat: number;
}
// Authentication tokens
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
}
// Standard API response
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    statusCode?: number;
    timestamp?: string;
    path?: string;
}
// Error response
export interface ApiError {
    status: number;
    message: string;
    errors?: Record<string, string[]>;
    timestamp?: string;
    path?: string;
}
// Login request/response
export interface LoginRequest {
    email: string;
    password: string;
    rememberMe?: boolean;
}
export interface LoginResponse extends ApiResponse<{
    user: User;
    tokens: AuthTokens;
}> {
}
// Register request/response
export interface RegisterRequest {
    email: string;
    password: string;
    username: string;
    firstName?: string;
    lastName?: string;
    organizationName?: string;
}
export interface RegisterResponse extends ApiResponse<{
    user: User;
    tokens: AuthTokens;
}> {
}
// Password reset request/response
export interface ForgotPasswordRequest {
    email: string;
}
export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
    confirmPassword: string;
}
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}
// Email verification
export interface VerifyEmailRequest {
    token: string;
}
// User profile update
export interface UpdateProfileRequest {
    firstName?: string;
    lastName?: string;
    avatar?: File;
}
// Organization types
export interface Organization {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    createdAt: string;
    updatedAt: string;
}
// Permission types
export interface Permission {
    id: string;
    name: string;
    description?: string;
    resource: string;
    action: string;
    createdAt: string;
    updatedAt: string;
}
// Role types
export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}
// Session information
export interface SessionInfo {
    id: string;
    ipAddress: string;
    userAgent: string;
    lastActive: string;
    createdAt: string;
    isCurrent: boolean;
}
// Audit log entry
export interface AuditLog {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    user?: User;
    ipAddress: string;
    userAgent: string;
    metadata?: Record<string, any>;
    timestamp: string;
}
// Pagination types
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}
// Query parameters for pagination
// Query parameters for pagination
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    [key: string]: any; // For additional filter parameters
}
// Generic response types for common operations
export type EmptyResponse = ApiResponse<null>;
export type SuccessResponse = ApiResponse<{
    success: boolean;
}>;
// Type for API error response
export type ApiErrorResponse = {
    response?: {
        data: {
            message?: string;
            error?: string;
            statusCode?: number;
        };
        status: number;
    };
    message?: string;
};
