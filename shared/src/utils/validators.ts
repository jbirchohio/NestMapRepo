// Utility functions to simplify complex conditional logic

/**
 * Validation utilities to replace complex conditionals
 */

// Coordinate validation
export interface Coordinates {
  lat: number;
  lng: number;
}

export function isValidCoordinates(center: unknown): center is [number, number] {
  return Array.isArray(center) && 
         center.length === 2 && 
         typeof center[0] === 'number' && 
         typeof center[1] === 'number' &&
         !isNaN(center[0]) && 
         !isNaN(center[1]) &&
         center[0] >= -180 && center[0] <= 180 &&
         center[1] >= -90 && center[1] <= 90;
}

export function hasValidLocation(activity: { latitude?: string; longitude?: string }): boolean {
  return !!(activity.latitude && 
           activity.longitude && 
           !isNaN(parseFloat(activity.latitude)) && 
           !isNaN(parseFloat(activity.longitude)));
}

// Request validation
export interface TripRequest {
  name?: string;
  endDate?: string;
  destination?: string;
}

export function isValidTripRequest(body: unknown): body is TripRequest {
  const req = body as TripRequest;
  return !!(req?.name && req?.endDate && req?.destination);
}

// User validation
export interface UserAuth {
  userId?: string | number;
  email?: string;
  role?: string;
}

export function isValidUserAuth(decoded: unknown): decoded is Required<UserAuth> {
  const user = decoded as UserAuth;
  return !!(user?.userId && user?.email && user?.role);
}

export function isValidJwtPayload(payload: unknown): payload is Required<Pick<UserAuth, 'userId' | 'email'>> & { jti: string } {
  const jwt = payload as UserAuth & { jti?: string };
  return !!(jwt?.userId && jwt?.email && jwt?.jti);
}

// Error type checking
export interface ErrorWithCode {
  statusCode?: number;
  status?: number;
  name?: string;
  code?: string;
}

export function isUnauthorizedError(err: ErrorWithCode): boolean {
  return err.statusCode === 401 || 
         err.status === 401 || 
         err.name === 'UnauthorizedError';
}

export function isNetworkError(err: ErrorWithCode): boolean {
  return err.code === 'ENOTFOUND' || 
         err.code === 'ECONNREFUSED' || 
         err.code === 'ECONNABORTED';
}

export function isDatabaseError(err: ErrorWithCode): boolean {
  const errorCode = err.code?.toString();
  return err.name === 'DatabaseError' || 
         (errorCode && errorCode.startsWith('23')) || 
         err.name === 'MongoError';
}

// Business logic validation
export interface CreateCustomerParams {
  name?: string;
  email?: string;
  billing?: {
    address?: any;
  };
}

export function isValidCustomerParams(params: CreateCustomerParams): boolean {
  return !!(params.name && params.email && params.billing?.address);
}

// Permission checking
export interface UserPermissions {
  userId: string | number;
  role: string;
}

export interface ResourceOwner {
  createdById: string | number;
}

export function canAccessResource(
  user: UserPermissions, 
  resource: ResourceOwner
): boolean {
  return resource.createdById === user.userId || 
         user.role === 'superadmin_owner' || 
         user.role === 'superadmin_staff';
}

// Token validation
export interface TokenData {
  revoked?: boolean;
  expiresAt?: Date;
}

export function isValidToken(token: TokenData | null): token is TokenData {
  if (!token) return false;
  
  return !token.revoked && 
         !!token.expiresAt && 
         token.expiresAt >= new Date();
}

// User reset token validation
export interface UserWithResetToken {
  resetTokenExpires?: Date;
}

export function hasValidResetToken(user: UserWithResetToken | null): user is UserWithResetToken {
  return !!(user?.resetTokenExpires && user.resetTokenExpires >= new Date());
}

// String validation for test emails
export function isTestEmail(email: string): boolean {
  const testPatterns = ['test@', 'login@', 'auth@', 'logout@'];
  return testPatterns.some(pattern => email.includes(pattern));
}

// Activity duration and time validation
export function hasValidTime(activity: { time?: string }): boolean {
  if (!activity.time) return false;
  
  try {
    const [hours, minutes] = activity.time.split(':').map(Number);
    return !isNaN(hours) && !isNaN(minutes) && 
           hours >= 0 && hours <= 23 && 
           minutes >= 0 && minutes <= 59;
  } catch {
    return false;
  }
}

// Registration field validation
export interface RegistrationData {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

export function isValidRegistrationData(data: RegistrationData): boolean {
  return !!(data.email && data.password && data.firstName && data.lastName);
}
