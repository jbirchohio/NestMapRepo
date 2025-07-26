import { type User } from '../../../db/schema';
import { BaseRepository } from '../base.repository.interface';

// Define UserBookingPreferences type if it doesn't exist
export type UserBookingPreferences = Record<string, any>;

export interface UserRepository extends BaseRepository<User, string, Omit<User, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>> {
  // User retrieval
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  findByOrganizationId(organizationId: string): Promise<User[]>;
  
  // User management
  create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: string, userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  
  // Authentication
  updatePassword(id: string, passwordHash: string): Promise<boolean>;
  updateLastLogin(id: string): Promise<boolean>;
  
  // Preferences (commented out as preferences field doesn't exist in schema)
  // updatePreferences(id: string, preferences: UserBookingPreferences): Promise<User | null>;
}

