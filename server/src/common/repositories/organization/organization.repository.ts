import { Injectable } from 'injection-js';
import { getDatabase } from '../../../db/connection';
import * as schema from '../../../db/schema';
import { OrganizationRepository } from './organization.repository.interface';
import { eq } from 'drizzle-orm';
import { BaseRepositoryImpl } from '../base.repository';

@Injectable()
export class OrganizationRepositoryImpl extends BaseRepositoryImpl<schema.Organization, string, Omit<schema.Organization, 'id' | 'createdAt' | 'updatedAt'>, Partial<Omit<schema.Organization, 'id' | 'createdAt' | 'updatedAt'>>> implements OrganizationRepository {
  constructor() {
    super('Organization', schema.organizations, schema.organizations.id);
  }

  async findBySlug(slug: string): Promise<schema.Organization | null> {
    this.logger.log(`Finding organization by slug: ${slug}`);
    
    const db = getDatabase();
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    return db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, slug))
      .limit(1)
      .then((orgs) => orgs[0] || null);
  }

  async getMembers(organizationId: string): Promise<schema.User[]> {
    this.logger.log(`Getting members for organization: ${organizationId}`);
    
    const db = getDatabase();
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    const members = await db
      .select({
        user: schema.users
      })
      .from(schema.organizationMembers)
      .innerJoin(schema.users, eq(schema.organizationMembers.userId, schema.users.id))
      .where(eq(schema.organizationMembers.organizationId, organizationId));
    
    return members.map(m => m.user);
  }

  async addMember(organizationId: string, userId: string, role: string): Promise<boolean> {
    this.logger.log(`Adding member ${userId} to organization ${organizationId} with role ${role}`);
    
    try {
      // Cast the role string to the expected enum type
      const validRole = role as "admin" | "manager" | "member" | "viewer" | "billing";
      
      const db = getDatabase();
      if (!db) {
        throw new Error('Database connection not available');
      }
      
      await db.insert(schema.organizationMembers).values({
        organizationId,
        userId,
        role: validRole,
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
    
    try {
      // Using a simpler syntax for delete operation
      const db = getDatabase(); if (!db) throw new Error("Database not available"); const result = await db
        .delete(schema.organizationMembers)
        .where(
          eq(schema.organizationMembers.organizationId, organizationId)
          .and(eq(schema.organizationMembers.userId, userId))
        );
      
      return result && result.length > 0;
    } catch (error) {
      this.logger.error(`Error removing member from organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  async updateMemberRole(organizationId: string, userId: string, role: string): Promise<boolean> {
    this.logger.log(`Updating role for member ${userId} in organization ${organizationId} to ${role}`);
    
    try {
      // Cast the role string to the expected enum type
      const validRole = role as "admin" | "manager" | "member" | "viewer" | "billing";
      
      // Using a simpler syntax for update operation
      const db = getDatabase(); if (!db) throw new Error("Database not available"); const result = await db
        .update(schema.organizationMembers)
        .set({
          role: validRole,
          updatedAt: new Date()
        })
        .where(
          eq(schema.organizationMembers.organizationId, organizationId)
          .and(eq(schema.organizationMembers.userId, userId))
        );
      
      return result && result.length > 0;
    } catch (error) {
      this.logger.error(`Error updating member role in organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  async updatePlan(organizationId: string, plan: 'free' | 'pro' | 'enterprise'): Promise<schema.Organization | null> {
    this.logger.log(`Updating plan for organization ${organizationId} to ${plan}`);
    
    const db = getDatabase(); if (!db) throw new Error("Database not available"); const [updatedOrg] = await db
      .update(schema.organizations)
      .set({
        plan,
        updatedAt: new Date()
      })
      .where(eq(schema.organizations.id, organizationId))
      .returning();
    
    return updatedOrg || null;
  }

  // Commented out as settings field doesn't exist in schema
  // async updateSettings(organizationId: string, settings: any): Promise<schema.Organization | null> {
  //   this.logger.log(`Updating settings for organization ${organizationId}`);
  //   
  //   const db = getDatabase(); if (!db) throw new Error("Database not available"); const [updatedOrg] = await db
  //     .update(schema.organizations)
  //     .set({
  //       settings,
  //       updatedAt: new Date()
  //     })
  //     .where(eq(schema.organizations.id, organizationId))
  //     .returning();
  //   
  //   return updatedOrg || null;
  // }
}
