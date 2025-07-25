import { Request, Response } from 'express';
import { db } from '../../db';
import { organizations, organizationMembers, users } from '../../shared/src/schema';
import { eq } from 'drizzle-orm';
import { or } from 'drizzle-orm/sql/expressions/conditions';
import { desc } from 'drizzle-orm/sql/expressions/select';
// TODO: Fix count and sql imports - may need different approachimport { logSuperadminAction } from '../audit-logs/audit-service';

// Get all organizations
export const getOrganizations = async (req: Request, res: Response) => {
  try {
    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        domain: organizations.slug, // Using slug as domain
        plan: organizations.plan,
        white_label_enabled: sql`${organizations.settings}->'whiteLabel'->>'enabled' = 'true'`,
        white_label_plan: organizations.plan, // Using plan since there's no separate white_label_plan
        employee_count: sql<number>`(SELECT COUNT(*) FROM ${users} WHERE ${users.organizationId} = ${organizations.id})`,
        subscription_status: organizations.subscriptionStatus,
        current_period_end: organizations.stripeCurrentPeriodEnd,
        created_at: organizations.createdAt,
        updated_at: organizations.updatedAt,
        user_count: sql<number>`(SELECT COUNT(*) FROM ${organizationMembers} WHERE ${organizationMembers.organizationId} = ${organizations.id})`,
      })
      .from(organizations)
      .orderBy(desc(organizations.createdAt));

    res.json(orgs);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
};

// Get single organization
export const getOrganization = async (req: Request, res: Response) => {
  try {
    const orgId = req.params.id;
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get organization members
    const members = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.organizationId, orgId))
      .orderBy(users.createdAt);

    return res.json({ ...org, members });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return res.status(500).json({ error: 'Failed to fetch organization' });
  }
};

// Create new organization
export const createOrganization = async (req: Request, res: Response) => {
  try {
    const { name, plan } = req.body;
    const userId = req.user?.id;

    // Generate a URL-friendly slug from the organization name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const [newOrg] = await db
      .insert(organizations)
      .values({
        name,
        slug,
        plan: plan || 'free',
        settings: {
          whiteLabel: {
            enabled: false
          }
        }
      })
      .returning();

    // Log the action
    if (userId) {
      await logSuperadminAction(
        parseInt(userId, 10),
        'CREATE_ORGANIZATION',
        'organization',
        newOrg.id,
        { name, plan }
      );
    }

    res.status(201).json(newOrg);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
};

// Update organization
export const updateOrganization = async (req: Request, res: Response) => {
  try {
    const orgId = req.params.id;
    const updates = req.body;
    const userId = req.user?.id;

    const [updatedOrg] = await db
      .update(organizations)
      .set({
        ...updates,
        updated_at: new Date(),
      })
      .where(eq(organizations.id, orgId))
      .returning();

    if (!updatedOrg) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Log the action
    if (userId) {
      await logSuperadminAction(
        parseInt(userId, 10),
        'UPDATE_ORGANIZATION',
        'organization',
        orgId,
        updates
      );
    }

    return res.json(updatedOrg);
  } catch (error) {
    console.error('Error updating organization:', error);
    return res.status(500).json({ error: 'Failed to update organization' });
  }
};

// Delete organization
export const deleteOrganization = async (req: Request, res: Response) => {
  try {
    const orgId = req.params.id;
    const userId = req.user?.id;

    // First check if organization exists
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Delete organization
    await db
      .delete(organizations)
      .where(eq(organizations.id, orgId));

    // Log the action
    if (userId) {
      await logSuperadminAction(
        parseInt(userId, 10),
        'DELETE_ORGANIZATION',
        'organization',
        orgId,
        { name: org.name }
      );
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return res.status(500).json({ error: 'Failed to delete organization' });
  }
};
