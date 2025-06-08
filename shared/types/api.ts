import { Response } from 'express';
import { BaseModel, PaginatedResponse } from './base';
import { User } from './auth';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
}

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
  isOperational?: boolean;
}

export interface ValidationError {
  field: string | number;
  message: string;
  type: string;
  context?: {
    label?: string;
    value?: unknown;
    key?: string;
  };
}

export interface ValidationErrorResponse extends ApiResponse {
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: ValidationError[];
  };
}

export interface AuthResponse extends ApiResponse<{ user: User; tokens: { accessToken: string; refreshToken: string } }> {}

export type ApiHandler<T = unknown> = (
  req: Express.Request,
  res: Response,
  next: Express.NextFunction
) => Promise<ApiResponse<T> | void> | ApiResponse<T> | void;

export interface ControllerResponse<T = unknown> {
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
  statusCode?: number;
  headers?: Record<string, string>;
}

export interface PaginatedControllerResponse<T> extends ControllerResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
