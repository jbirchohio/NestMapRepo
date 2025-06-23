// Base types that are used across the application
export type Timestamp = string | Date;
export interface BaseModel {
    id: number | string;
    created_at?: Timestamp;
    updated_at?: Timestamp;
    deleted_at?: Timestamp | null;
}
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export type Nullable<T> = T | null;
