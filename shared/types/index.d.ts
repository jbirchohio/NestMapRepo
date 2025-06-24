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

// Import types for reference
import * as BaseTypes from './core/base';
import * as AuthTypes from './auth';
import * as UserTypes from './domain/user';
import * as OrganizationTypes from './domain/organization';
import * as FlightTypes from './flight';

// Re-export everything under the SharedTypes namespace for backward compatibility
declare global {
  namespace SharedTypes {
    // Core types
    export type ID = BaseTypes.ID;
    export type UUID = BaseTypes.UUID;
    export type ISO8601DateTime = BaseTypes.ISO8601DateTime;
    export type Email = BaseTypes.Email;
    export type URL = BaseTypes.URL;
    export type Nullable<T> = BaseTypes.Nullable<T>;
    export type Optional<T> = BaseTypes.Optional<T>;
    export type Timestamps = BaseTypes.Timestamps;
    export type PaginationParams = BaseTypes.PaginationParams;
    export type PaginatedResponse<T> = BaseTypes.PaginatedResponse<T>;
    export type ApiResponse<T = unknown> = BaseTypes.ApiResponse<T>;
    export type ApiError = BaseTypes.ApiError;
    
    // Auth types
    export type UserRole = AuthTypes.UserRole;
    export type Permission = AuthTypes.Permission;
    export type TokenType = AuthTypes.TokenType;
    export type JwtPayload = AuthTypes.JwtPayload;
    export type AuthTokens = AuthTypes.AuthTokens;
    export type AuthResponse = AuthTypes.AuthResponse;
    
    // User types
    export type UserPreferences = UserTypes.UserPreferences;
    export type UserStatus = UserTypes.UserStatus;
    export type BaseUser = UserTypes.BaseUser;
    export type User = UserTypes.User;
    export type UserResponse = UserTypes.UserResponse;
    export type CreateUserDto = UserTypes.CreateUserDto;
    export type UpdateUserDto = UserTypes.UpdateUserDto;
    
    // Organization types
    export type OrganizationPlan = OrganizationTypes.OrganizationPlan;
    export type OrganizationSettings = OrganizationTypes.OrganizationSettings;
    export type Organization = OrganizationTypes.Organization;
    export type OrganizationMember = OrganizationTypes.OrganizationMember;
    export type OrganizationRole = OrganizationTypes.OrganizationRole;
    export type CreateOrganizationDto = OrganizationTypes.CreateOrganizationDto;
    export type UpdateOrganizationDto = OrganizationTypes.UpdateOrganizationDto;
    export type OrganizationMemberDto = OrganizationTypes.OrganizationMemberDto;
    export type OrganizationResponse = OrganizationTypes.OrganizationResponse;
    export type OrganizationListResponse = OrganizationTypes.OrganizationListResponse;
    export type OrganizationMemberListResponse = OrganizationTypes.OrganizationMemberListResponse;
    
    // Flight types
    export type Airport = FlightTypes.Airport;
    export type FlightSegment = FlightTypes.FlightSegment;
    export type FlightPrice = FlightTypes.FlightPrice;
    export type Flight = FlightTypes.Flight;
    export type FlightSearchParams = FlightTypes.FlightSearchParams;
    export type FlightSearchResponse = FlightTypes.FlightSearchResponse;
    
    // Trip types
    export type Trip = {
      id: UUID;
      name: string;
      description?: string | null;
      startDate: ISO8601DateTime;
      endDate: ISO8601DateTime;
      createdById: UUID;
      organizationId: UUID;
      isArchived: boolean;
      coverImageUrl?: URL | null;
    };
    
    export type TripMemberRole = 'owner' | 'editor' | 'viewer';
    
    export type TripMember = {
      id: UUID;
      tripId: UUID;
      userId: UUID;
      role: TripMemberRole;
      joinedAt: ISO8601DateTime;
    };
    
    // Utility Types
    export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
    export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
  }
  
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
