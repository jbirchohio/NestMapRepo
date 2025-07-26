// Use direct type imports to avoid value/type confusion
import * as schema from '../../../db/schema';
import { BaseRepository } from '../base.repository.interface';

// Define OrganizationBookingSettings type if it doesn't exist
export type OrganizationBookingSettings = Record<string, any>;

export interface OrganizationRepository extends BaseRepository<schema.Organization, string, Omit<schema.Organization, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<schema.Organization, 'id' | 'createdAt' | 'updatedAt'>>> {
  // Organization retrieval
  findById(id: string): Promise<schema.Organization | null>;
  findBySlug(slug: string): Promise<schema.Organization | null>;
  findAll(): Promise<schema.Organization[]>;
  
  // Organization management
  create(organizationData: Omit<schema.Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<schema.Organization>;
  update(id: string, organizationData: Partial<Omit<schema.Organization, 'id' | 'createdAt' | 'updatedAt'>>): Promise<schema.Organization | null>;
  delete(id: string): Promise<boolean>;
  
  // Organization members
  getMembers(organizationId: string): Promise<schema.User[]>;
  addMember(organizationId: string, userId: string, role: string): Promise<boolean>;
  removeMember(organizationId: string, userId: string): Promise<boolean>;
  updateMemberRole(organizationId: string, userId: string, role: string): Promise<boolean>;
  
  // Plan and settings (commented out settings as it doesn't exist in schema)
  updatePlan(organizationId: string, plan: 'free' | 'pro' | 'enterprise'): Promise<schema.Organization | null>;
  // updateSettings(organizationId: string, settings: OrganizationBookingSettings): Promise<schema.Organization | null>;
}

