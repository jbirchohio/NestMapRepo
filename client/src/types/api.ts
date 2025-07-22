export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface ApiErrorResponse {
  success: false;
  message?: string;
  errors?: string[];
  status?: number;
  statusText?: string;
}

export interface JwtPayload {
  exp?: number; // Made optional since jsonwebtoken sets this when using expiresIn
  iat: number;
  sub: string;
  email: string;
  role: string;
  organization_id?: number;
  [key: string]: unknown;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  organization_id: number | null;
  permissions?: string[];
}

export interface PerformanceMetrics {
  timestamp: string;
  requestTime: number;
  responseTime: number;
  totalDuration: number;
  method: string;
  url: string;
  status: number | null;
  size: number;
  userId: string | null;
  sessionId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  errorType: string | null;
  errorMessage: string | null;
}
