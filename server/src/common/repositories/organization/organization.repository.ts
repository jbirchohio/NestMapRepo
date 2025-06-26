import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@shared/../server/db/db.js';
import { organizations, organizationMembers } from '@shared/../server/db/schema.js';
import { BaseRepositoryImpl } from '../base.repository.js';
import type { OrganizationRepository } from './organization.repository.interface.js';
import type { 
  Organization, 
  OrganizationMember, 
  OrganizationRole,
  OrganizationPlan,
  CreateOrganizationData,
  UpdateOrganizationData,
  OrganizationSettings
} from '@shared/types/organizations.js';
import { users } from '@shared/../server/db/schema.js';

@Injectable()
export class OrganizationRepositoryImpl 
  extends BaseRepositoryImpl<Organization, string, CreateOrganizationData, UpdateOrganizationData>
  implements OrganizationRepository {
  
  protected mapToModel(data: any): Organization {
    return {
      ...data,
      status: 'active' as const,
      logoUrl: data.logoUrl || null,
      billingEmail: data.billingEmail || null,
      subscriptionId: data.stripeSubscriptionId || null,
      subscriptionStatus: data.subscriptionStatus || null,
      trialEndsAt: data.stripeCurrentPeriodEnd || null,
      deletedAt: null,
      metadata: data.metadata || {},
      settings: {
        timezone: data.settings?.timezone || 'UTC',
        locale: data.settings?.locale || 'en-US',
        whiteLabel: data.settings?.whiteLabel || { enabled: false }
      },
    };
  }

  constructor() {
    super('organization', organizations, organizations.id);
  }

  /**
   * Finds an organization by its slug
   * @param slug - The URL-friendly identifier for the organization
   * @returns The organization if found, null otherwise
   */
  async findBySlug(slug: string): Promise<Organization | null> {
    try {
      const [result] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1);
      
      return result ? this.mapToModel(result) : null;
    } catch (error) {
      this.logger.error(`Error finding organization by slug ${slug}:`, error);
      return null;
    }
  }

  /**
   * Retrieves all members of an organization
   * @param organizationId - The ID of the organization
   * @returns Array of organization members with user data
   */
  async getMembers(organizationId: string): Promise<OrganizationMember[]> {
    try {
      const members = await db
        .select({
          // Organization member fields
          id: organizationMembers.id,
          organizationId: organizationMembers.organizationId,
          userId: organizationMembers.userId,
          role: organizationMembers.role,
          status: organizationMembers.status,
          joinedAt: organizationMembers.joinedAt,
          invitedAt: organizationMembers.invitedAt,
          permissions: organizationMembers.permissionsOverride || [],
          // User fields
          user: {
            id: users.id,
            email: users.email,
            username: users.username,
            first_name: users.firstName,
            last_name: users.lastName,
            full_name: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
            avatar_url: users.avatarUrl,
            email_verified: users.emailVerified,
            last_login_at: users.lastLoginAt,
            timezone: sql<string>`'UTC'`,
            locale: sql<string>`'en-US'`,
            settings: sql<Record<string, unknown>>`'{}'::jsonb`,
            metadata: sql<Record<string, unknown>>`'{}'::jsonb`,
          },
        })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(eq(organizationMembers.organizationId, organizationId));
      
      return members.map(member => ({
        id: member.id,
        userId: member.userId,
        organizationId: member.organizationId,
        role: member.role as UserRole,
        joinDate: member.joinedAt || member.invitedAt || new Date(),
        permissions: member.permissions || [],
        user: {
          id: member.user.id,
          email: member.user.email,
          username: member.user.username || '',
          firstName: member.user.first_name || null,
          lastName: member.user.last_name || null,
          fullName: member.user.full_name || member.user.email,
          avatarUrl: member.user.avatar_url || null,
          role: member.role as UserRole,
          organizationId: member.organizationId,
          organization: undefined,
          organizationMember: undefined,
          emailVerified: member.user.email_verified || false,
          lastLogin: member.user.last_login_at || null,
          timezone: 'UTC',
          locale: 'en-US',
          settings: {},
          metadata: {},
        },
        metadata: {}
      }));
    } catch (error) {
      this.logger.error(`Error getting members for organization ${organizationId}:`, error);
      return [];
    }
  }

  /**
   * Adds a user as a member to an organization
   * @param organizationId - The ID of the organization
   * @param userId - The ID of the user to add
   * @param role - The role to assign to the user
   * @returns The created organization member
   */
  async addMember(
    organizationId: string,
    userId: string,
    role: OrganizationRole = 'member',
  ): Promise<OrganizationMember> {
    try {
      const [result] = await db
        .insert(organizationMembers)
        .values({
          organizationId,
          userId,
          role,
          status: 'active',
        })
        .onConflictDoUpdate({
          target: [organizationMembers.organizationId, organizationMembers.userId],
          set: { 
            role,
            status: 'active',
            updatedAt: new Date(),
          },
        })
        .returning();
      
      return result;
    } catch (error) {
      this.logger.error(
        `Error adding user ${userId} to organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Removes a user from an organization
   * @param organizationId - The ID of the organization
   * @param userId - The ID of the user to remove
   * @returns true if removed, false otherwise
   */
  async removeMember(organizationId: string, userId: string): Promise<boolean> {
    try {
      const [deleted] = await db
        .delete(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, userId),
          ),
        )
        .returning({ id: organizationMembers.id });
      
      return !!deleted;
    } catch (error) {
      this.logger.error(
        `Error removing user ${userId} from organization ${organizationId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Updates a member's role in an organization
   * @param organizationId - The ID of the organization
   * @param userId - The ID of the user
   * @param role - The new role
   * @returns true if updated, false otherwise
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrganizationRole,
  ): Promise<boolean> {
    try {
      const [updated] = await db
        .update(organizationMembers)
        .set({ 
          role,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, userId),
          ),
        )
        .returning({ id: organizationMembers.id });
      
      return !!updated;
    } catch (error) {
      this.logger.error(
        `Error updating role for user ${userId} in organization ${organizationId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Updates an organization's subscription plan
   * @param organizationId - The ID of the organization
   * @param plan - The new plan
   * @returns The updated organization, or null if not found
   */
  async updatePlan(
    organizationId: string,
    plan: OrganizationPlan,
  ): Promise<Organization | null> {
    try {
      const [updated] = await db
        .update(organizations)
        .set({ 
          plan,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organizationId))
        .returning();
      
      return updated ? this.mapToModel(updated) : null;
    } catch (error) {
      this.logger.error(
        `Error updating plan for organization ${organizationId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Updates an organization's settings
   * @param organizationId - The ID of the organization
   * @param settings - The new settings (shallow merged with existing)
   * @returns The updated organization, or null if not found
   */
  async updateSettings(
    organizationId: string,
    settings: Partial<OrganizationSettings>,
  ): Promise<Organization | null> {
    try {
      // Update only the provided settings, preserving existing ones
      const [updated] = await db
        .update(organizations)
        .set({ 
          settings: sql`COALESCE(settings, '{}'::jsonb) || ${settings}`,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, organizationId))
        .returning();
      
      return updated ? this.mapToModel(updated) : null;
    } catch (error) {
      this.logger.error(
        `Error updating settings for organization ${organizationId}:`,
        error,
      );
      return null;
    }
  }
}
