// Define interfaces locally to avoid import errors
interface User {
  id: string;
  email: string;
  password_hash?: string;
  role: string;
  organization_id?: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  isActive?: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: Date;
}

interface BaseRepository<T, ID, CreateDTO, UpdateDTO> {
  findAll(): Promise<T[]>;
  findById(id: ID): Promise<T | undefined>;
  create(data: CreateDTO): Promise<T>;
  update(id: ID, data: UpdateDTO): Promise<T | undefined>;
  delete(id: ID): Promise<boolean>;
}

/**
 * User repository interface that extends the base repository interface
 * Adds user-specific operations to the common CRUD operations
 */
export interface UserRepository extends BaseRepository<User, string, Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'emailVerified' | 'isActive' | 'failedLoginAttempts' | 'lockedUntil'>, Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>> {
  // User retrieval
  findByEmail(email: string): Promise<User | undefined>;
  findById(id: string): Promise<User | undefined>;
  
  // Authentication related
  incrementFailedLoginAttempts(userId: string): Promise<void>;
  resetFailedLoginAttempts(userId: string): Promise<void>;
  lockAccount(userId: string, lockedUntil: Date): Promise<void>;
  updateLastLogin(userId: string, ipAddress: string): Promise<void>;
  isAccountLocked(user: User): boolean;
  
  // User management
  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'emailVerified' | 'isActive' | 'failedLoginAttempts' | 'lockedUntil'>, password: string): Promise<User>;
  updateUser(userId: string, userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User | undefined>;
  deleteUser(userId: string): Promise<boolean>;
  
  // Email verification
  verifyEmail(userId: string): Promise<boolean>;
  
  // Password management
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;
  setPassword(userId: string, newPassword: string): Promise<boolean>;
  updatePassword(userId: string, newPassword: string): Promise<boolean>;
  
  // Preferences
  updatePreferences(userId: string, preferences: Record<string, unknown>): Promise<boolean>;
  
  // Password reset
  findByResetToken(token: string): Promise<User | null>;
  setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  clearPasswordResetToken(userId: string): Promise<void>;
}
