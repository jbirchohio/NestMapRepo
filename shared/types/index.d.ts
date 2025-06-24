// Shared Type Definitions
// This is the single source of truth for all shared types
// Used by both client and server

// Core types
export * from './core/base';

// Auth types
export * from './auth';

// Domain types
export * from './domain/user';
export * from './domain/organization';
export * from './flight';

// Re-export everything under the SharedTypes namespace for backward compatibility
declare global {
  namespace SharedTypes {
    // Core types
    export import ID = import('./core/base').ID;
    export import UUID = import('./core/base').UUID;
    export import ISO8601DateTime = import('./core/base').ISO8601DateTime;
    export import Email = import('./core/base').Email;
    export import URL = import('./core/base').URL;
    export import Nullable = import('./core/base').Nullable;
    export import Optional = import('./core/base').Optional;
    export import Timestamps = import('./core/base').Timestamps;
    export import PaginationParams = import('./core/base').PaginationParams;
    export import PaginatedResponse = import('./core/base').PaginatedResponse;
    export import ApiResponse = import('./core/base').ApiResponse;
    export import ApiError = import('./core/base').ApiError;
    
    // Auth types
    export import UserRole = import('./auth').UserRole;
    export import Permission = import('./auth').Permission;
    export import TokenType = import('./auth').TokenType;
    export import JwtPayload = import('./auth').JwtPayload;
    export import AuthTokens = import('./auth').AuthTokens;
    export import AuthResponse = import('./auth').AuthResponse;
    
    // User types
    export import UserPreferences = import('./domain/user').UserPreferences;
    export import UserStatus = import('./domain/user').UserStatus;
    export import BaseUser = import('./domain/user').BaseUser;
    export import UserResponse = import('./domain/user').UserResponse;
    export import CreateUserDto = import('./domain/user').CreateUserDto;
    export import UpdateUserDto = import('./domain/user').UpdateUserDto;
    
    // Organization types
    export import OrganizationPlan = import('./domain/organization').OrganizationPlan;
    export import OrganizationSettings = import('./domain/organization').OrganizationSettings;
    
    // Flight types
    export import Airport = import('./flight').Airport;
    export import FlightSegment = import('./flight').FlightSegment;
    export import FlightPrice = import('./flight').FlightPrice;
    export import Flight = import('./flight').Flight;
    export import FlightSearchParams = import('./flight').FlightSearchParams;
    export import FlightSearchResponse = import('./flight').FlightSearchResponse;
    export import Organization = import('./domain/organization').Organization;
    export import OrganizationMember = import('./domain/organization').OrganizationMember;
    export import OrganizationRole = import('./domain/organization').OrganizationRole;
    export import CreateOrganizationDto = import('./domain/organization').CreateOrganizationDto;
    export import UpdateOrganizationDto = import('./domain/organization').UpdateOrganizationDto;
    export import OrganizationMemberDto = import('./domain/organization').OrganizationMemberDto;
    export import OrganizationResponse = import('./domain/organization').OrganizationResponse;
    export import OrganizationListResponse = import('./domain/organization').OrganizationListResponse;
    export import OrganizationMemberListResponse = import('./domain/organization').OrganizationMemberListResponse;
  }
  
  // For global access to SharedTypes
  // eslint-disable-next-line no-var
  var SharedTypes: typeof SharedTypes;
}
    preferences?: UserPreferences;
    
    // Authentication related fields (server-only, excluded from client)
    passwordHash?: never;
    emailVerificationToken?: never;
    passwordResetToken?: never;
    resetToken?: never;
    resetTokenExpires?: never;
    mfaSecret?: never;
  }
  
  /** User data returned by the API */
  type UserResponse = Omit<User, 
    'passwordHash' | 'emailVerificationToken' | 'passwordResetToken' | 
    'resetToken' | 'resetTokenExpires' | 'mfaSecret'
  >;
  
  /** User data for creating a new user */
  interface CreateUserDto {
    email: Email;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
    organizationId?: UUID;
  }
  
  /** User data for updates */
  type UpdateUserDto = Partial<Omit<CreateUserDto, 'email' | 'password'>>;
  
  // ======================
  // Organization Types
  // ======================
  
  /** Organization plans */
  type OrganizationPlan = 'free' | 'pro' | 'enterprise';
  
  /** Organization settings */
  interface OrganizationSettings {
    requireEmailVerification?: boolean;
    allowSignups?: boolean;
    maxUsers?: number;
    branding?: {
      logoUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
  }
  
  /** Organization type */
  interface Organization extends Timestamps {
    id: UUID;
    name: string;
    slug: string;
    plan: OrganizationPlan;
    settings: OrganizationSettings;
    isActive: boolean;
    ownerId: UUID;
    billingEmail?: Email | null;
    logoUrl?: URL | null;
  }
  
  // ======================
  // API Response Types
  // ======================
  
  /** Standard API response */
  interface ApiResponse<T = unknown> {
    data: T;
    message?: string;
    meta?: {
      total?: number;
      page?: number;
      pageSize?: number;
      hasMore?: boolean;
    };
  }
  
  /** API error response */
  interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
  }
  
  // ======================
  // Utility Types
  // ======================
  
  /** Make specific properties required */
  type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
  
  /** Make specific properties optional */
  type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
  
  /** Pagination parameters */
  interface PaginationParams {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
  
  /** Paginated response */
  interface PaginatedResponse<T> extends ApiResponse<T[]> {
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasMore: boolean;
    };
  }

  // Organization
  type OrganizationPlan = 'free' | 'pro' | 'enterprise';
  
  interface Organization extends Timestamps {
    id: UUID;
    name: string;
    slug: string;
    plan: OrganizationPlan;
    isActive: boolean;
    billingEmail?: Email | null;
    logoUrl?: URL | null;
  }

  // Trips
  interface Trip extends Timestamps {
    id: UUID;
    name: string;
    description?: string | null;
    startDate: ISO8601DateTime;
    endDate: ISO8601DateTime;
    createdById: UUID;
    organizationId: UUID;
    isArchived: boolean;
    coverImageUrl?: URL | null;
  }

  // Trip Members
  type TripMemberRole = 'owner' | 'editor' | 'viewer';
  
  interface TripMember extends Timestamps {
    id: UUID;
    tripId: UUID;
    userId: UUID;
    role: TripMemberRole;
    joinedAt: ISO8601DateTime;
  }

  // API Response Types
  interface ApiResponse<T = unknown> {
    data: T;
    message?: string;
    meta?: {
      total?: number;
      page?: number;
      pageSize?: number;
      hasMore?: boolean;
    };
  }

  interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
  }

  // Authentication
  interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  }

  interface AuthResponse extends ApiResponse<{ user: User; tokens: AuthTokens }> {}
  
  // Utility Types
  type Nullable<T> = T | null;
  type Optional<T> = T | undefined;
  type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
  type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
  
  // Pagination
  interface PaginationParams {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
  
  interface PaginatedResponse<T> extends ApiResponse<T[]> {
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasMore: boolean;
    };
  }
}

// Global type augmentation
declare global {
  // For Express Request type augmentation
  namespace Express {
    interface Request {
      user?: SharedTypes.User;
    }
  }
  
  // For global access to SharedTypes
  // eslint-disable-next-line no-var
  var SharedTypes: typeof SharedTypes;
}
