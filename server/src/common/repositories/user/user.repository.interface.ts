import type { 
  User,
  UserRole,
  UserCreateInput,
  UserUpdateInput,
  UserSettings,
  UserProfile,
  UserStats,
  UserActivity,
  PaginationParams,
  PaginatedResponse 
} from '@shared/schema/types/user';
import type { BaseRepository } from '../base.repository.interface.js';

/**
 * Extended user type that includes password hash for internal use
 */
export interface UserWithPassword extends Omit<User, 'password'> {
  passwordHash: string;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
}
/**
 * Interface for user data access operations
 */
export interface UserRepository extends BaseRepository<User, string, UserCreateInput, UserUpdateInput> {
    // User retrieval
    
    /**
     * Finds a user by their email address
     * @param email - The email address to search for
     * @returns The user if found, null otherwise
     */
    findByEmail(email: string): Promise<User | null>;
    
    /**
     * Finds a user by their email and organization ID
     * @param email - The email address to search for
     * @param organizationId - The organization ID to filter by
     * @returns The user if found, null otherwise
     */
    findByEmailAndOrganization(email: string, organizationId: string): Promise<User | null>;
    
    /**
     * Finds all users in the system with pagination
     * @param params - Pagination and filtering parameters
     * @returns Paginated list of users
     */
    findAll(params?: UserListParams): Promise<PaginatedResponse<User>>;
    
    /**
     * Finds users by organization ID
     * @param organizationId - The organization ID to filter by
     * @param params - Additional query parameters
     * @returns List of users in the organization
     */
    findByOrganizationId(organizationId: string, params?: PaginationParams): Promise<User[]>;
    
    // User management
    
    /**
     * Creates a new user
     * @param userData - The user data to create
     * @returns The created user
     */
    create(userData: UserCreateInput): Promise<User>;
    
    /**
     * Updates an existing user
     * @param id - The ID of the user to update
     * @param userData - The data to update
     * @returns The updated user, or null if not found
     */
    update(id: string, userData: UserUpdateInput): Promise<User | null>;
    
    /**
     * Soft deletes a user
     * @param id - The ID of the user to delete
     * @returns true if deleted, false otherwise
     */
    delete(id: string): Promise<boolean>;
    
    // Authentication
    
    /**
     * Updates a user's password
     * @param id - The ID of the user
     * @param passwordHash - The new password hash
     * @returns true if updated, false otherwise
     */
    updatePassword(id: string, passwordHash: string): Promise<boolean>;
    
    /**
     * Updates the user's last login timestamp
     * @param id - The ID of the user
     * @returns true if updated, false otherwise
     */
    updateLastLogin(id: string): Promise<boolean>;
    
    /**
     * Verifies a user's password
     * @param userId - The ID of the user
     * @param password - The password to verify
     * @returns true if the password matches, false otherwise
     */
    verifyPassword(userId: string, password: string): Promise<boolean>;
    
    // User settings and preferences
    
    /**
     * Updates a user's settings
     * @param id - The ID of the user
     * @param settings - The new settings (shallow merged with existing)
     * @returns The updated user, or null if not found
     */
    updateSettings(id: string, settings: Partial<UserSettings>): Promise<User | null>;
    
    // User profile and stats
    
    /**
     * Gets a user's profile with extended information
     * @param id - The ID of the user
     * @returns The user profile, or null if not found
     */
    getProfile(id: string): Promise<UserProfile | null>;
    
    /**
     * Gets user statistics
     * @returns User statistics
     */
    getStats(): Promise<UserStats>;
    
    /**
     * Gets a user's recent activities
     * @param userId - The ID of the user
     * @param limit - Maximum number of activities to return
     * @returns List of user activities
     */
    getRecentActivities(userId: string, limit?: number): Promise<UserActivity[]>;
}

/**
 * Parameters for listing users with pagination and filtering
 */
export interface UserListParams extends PaginationParams {
  /** Search term for filtering users */
  search?: string;
  
  /** Filter by role */
  role?: UserRole | UserRole[];
  
  /** Filter by organization ID */
  organizationId?: string | string[];
  
  /** Filter by email verification status */
  emailVerified?: boolean;
  
  /** Filter by user status */
  status?: 'active' | 'inactive' | 'suspended' | 'invited';
  
  /** Field to sort by */
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLogin' | 'role';
  
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}
