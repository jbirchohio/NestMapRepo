import { Request, Response, NextFunction } from 'express';
import { db } from '../db-connection.js';
import { users, organizations } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

// Extend Request interface to include organization data
declare global {
  namespace Express {
    interface Request {
      organization?: {
        id: string;
        name: string;
        slug: string;
      };
      user?: {
        id: string;
        email: string;
        role: string;
        organizationId?: string;
      };
    }
  }
}

/**
 * Middleware to add organization scope to requests
 * Ensures users can only access data within their organization
 */
export const addOrganizationScope = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // Skip if no user is authenticated
    if (!req.user?.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Get user's organization ID
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, req.user!.id),
      columns: {
        id: true,
        organizationId: true
      }
    });

    if (!user || !user.organizationId) {
      res.status(403).json({ error: 'User not associated with an organization' });
      return;
    }

    // Get organization details
    const organization = await db.query.organizations.findFirst({
      where: (organizations, { eq }) => eq(organizations.id, user.organizationId),
      columns: {
        id: true,
        name: true,
        slug: true
      }
    });

    if (!organization) {
      res.status(403).json({ error: 'Organization not found' });
      return;
    }

    // Add organization context to request
    req.organization = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug
    };

    // Update user context with organization ID
    req.user.organizationId = organization.id;

    next();
  } catch (error) {
    console.error('Organization scope middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Helper function to validate organization access
 */
export const validateOrganizationAccess = (
  userOrganizationId: string,
  requestedOrganizationId: string
): boolean => {
  return userOrganizationId === requestedOrganizationId;
};

/**
 * Middleware to ensure organization-scoped queries
 * Adds WHERE clause for organization ID to prevent cross-organization data access
 */
export const enforceOrganizationScope = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.organization?.id) {
    res.status(403).json({ error: 'Organization context not found' });
    return;
  }

  // Add organization filter to query parameters if not present
  if (!req.query.organizationId) {
    req.query.organizationId = req.organization.id;
  } else if (req.query.organizationId !== req.organization.id) {
    res.status(403).json({ error: 'Access denied to requested organization' });
    return;
  }

  next();
};