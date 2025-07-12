import { User } from '../../../db/schema.js.js';
import { BaseRepository } from '../base.repository.interface.js';
import { UserBookingPreferences } from '../../interfaces/booking.interfaces.js';

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
  
  // Preferences
  updatePreferences(id: string, preferences: UserBookingPreferences): Promise<User | null>;
}
