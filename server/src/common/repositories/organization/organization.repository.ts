import { Injectable } from '@nestjs/common.js';
import { eq, and } from 'drizzle-orm.js';
import { db } from '../../../../db.js';
import { organizations, organizationMembers, users, type Organization, type User } from '../../../../db/schema.js.js';
import { OrganizationRepository } from './organization.repository.interface.js';
import { OrganizationBookingSettings } from '../../interfaces/booking.interfaces.js';
import { BaseRepositoryImpl } from '../base.repository.js';

@Injectable()
export class OrganizationRepositoryImpl extends BaseRepositoryImpl<Organization, string, Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>>> implements OrganizationRepository {
  constructor() {
    super('Organization', organizations, organizations.id);
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    this.logger.log(`Finding organization by slug: ${slug}`);
    
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    
    return organization || null;
  }

  async getMembers(organizationId: string): Promise<User[]> {
    this.logger.log(`Getting members for organization: ${organizationId}`);
    
    const members = await db
      .select({
        user: users
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, organizationId));
    
    return members.map(m => m.user);
  }

  async addMember(organizationId: string, userId: string, role: string): Promise<boolean> {
    this.logger.log(`Adding member ${userId} to organization ${organizationId} with role ${role}`);
    
    try {
      await db
        .insert(organizationMembers)
        .values({
          organizationId,
          userId,
          role,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      
      return true;
    } catch (error) {
      this.logger.error(`Error adding member to organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  async removeMember(organizationId: string, userId: string): Promise<boolean> {
    this.logger.log(`Removing member ${userId} from organization ${organizationId}`);
    
    const result = await db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        )
      );
    
    return result.rowCount > 0;
  }

  async updateMemberRole(organizationId: string, userId: string, role: string): Promise<boolean> {
    this.logger.log(`Updating role for member ${userId} in organization ${organizationId} to ${role}`);
    
    const result = await db
      .update(organizationMembers)
      .set({
        role,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        )
      );
    
    return result.rowCount > 0;
  }

  async updatePlan(organizationId: string, plan: 'free' | 'pro' | 'enterprise'): Promise<Organization | null> {
    this.logger.log(`Updating plan for organization ${organizationId} to ${plan}`);
    
    const [updatedOrg] = await db
      .update(organizations)
      .set({
        plan,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, organizationId))
      .returning();
    
    return updatedOrg || null;
  }

  async updateSettings(organizationId: string, settings: OrganizationBookingSettings): Promise<Organization | null> {
    this.logger.log(`Updating settings for organization ${organizationId}`);
    
    const [updatedOrg] = await db
      .update(organizations)
      .set({
        settings,
        updatedAt: new Date()
      })
      .where(eq(organizations.id, organizationId))
      .returning();
    
    return updatedOrg || null;
  }
}
