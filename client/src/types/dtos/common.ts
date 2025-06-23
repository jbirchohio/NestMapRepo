// Common types used across DTOs
export type Timestamp = string; // ISO 8601 format
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}
export interface ErrorResponse {
    message: string;
    code?: string;
    statusCode?: number;
    details?: Record<string, unknown>;
}
export type SortDirection = 'asc' | 'desc';
export interface SortOption {
    field: string;
    direction: SortDirection;
}
export interface PaginationParams {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDirection?: SortDirection;
}
export enum UserRole {
    // System roles
    SUPER_ADMIN = 'super_admin',
    // Business roles
    AGENCY = 'agency',
    CORPORATE = 'corporate',
    TRAVELER = 'traveler',
    // Organization roles
    ADMIN = 'admin',
    MANAGER = 'manager',
    MEMBER = 'member',
    GUEST = 'guest'
}
export enum TripStatus {
    DRAFT = 'draft',
    PLANNING = 'planning',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}
// Consolidated UserRole enum above
