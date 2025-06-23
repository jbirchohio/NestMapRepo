import type { User } from '../../../db/schema.js';
import type { BaseRepository } from '../base.repository.interface.js';
import type { UserBookingPreferences } from '../../interfaces/booking.interfaces.js';
import type { UserResponse } from '@shared/types/auth/dto/index.js';
export interface UserRepository extends BaseRepository<User, string, Omit<User, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>> {
    // User retrieval
    findById(id: string): Promise<UserResponse | null>;
    findByEmail(email: string): Promise<UserResponse | null>;
    findByEmailAndTenant(email: string, tenantId: string): Promise<UserResponse | null>;
    findAll(): Promise<UserResponse[]>;
    findByOrganizationId(organizationId: string): Promise<UserResponse[]>;
    
    // User management
    create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserResponse>;
    update(id: string, userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<UserResponse | null>;
    delete(id: string): Promise<boolean>;
    
    // Authentication
    updatePassword(id: string, passwordHash: string): Promise<boolean>;
    updateLastLogin(id: string): Promise<boolean>;
    
    // Preferences
    updatePreferences(id: string, preferences: UserBookingPreferences): Promise<UserResponse | null>;
    
    // Additional auth methods
    verifyPassword(userId: string, password: string): Promise<boolean>;
}
