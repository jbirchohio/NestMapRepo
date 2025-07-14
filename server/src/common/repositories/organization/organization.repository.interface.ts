import { Organization, User } from '../../db/schema.js';
import { BaseRepository } from '../base.repository.interface.js';

// Define OrganizationBookingSettings type if it doesn't exist
export type OrganizationBookingSettings = Record<string, any>;

export interface OrganizationRepository extends BaseRepository<Organization, string, Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>>> {
  // Organization retrieval
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  findAll(): Promise<Organization[]>;
  
  // Organization management
  create(organizationData: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization>;
  update(id: string, organizationData: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Organization | null>;
  delete(id: string): Promise<boolean>;
  
  // Organization members
  getMembers(organizationId: string): Promise<User[]>;
  addMember(organizationId: string, userId: string, role: string): Promise<boolean>;
  removeMember(organizationId: string, userId: string): Promise<boolean>;
  updateMemberRole(organizationId: string, userId: string, role: string): Promise<boolean>;
  
  // Plan and settings (commented out settings as it doesn't exist in schema)
  updatePlan(organizationId: string, plan: 'free' | 'pro' | 'enterprise'): Promise<Organization | null>;
  // updateSettings(organizationId: string, settings: OrganizationBookingSettings): Promise<Organization | null>;
}
