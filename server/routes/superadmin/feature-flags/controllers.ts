import { Request, Response } from 'express';
import { db } from '@shared/../db';
import { 
  superadminFeatureFlags, 
  organizationFeatureFlags,
  organizations
} from '@shared/../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logSuperadminAction } from '../audit-logs/audit-service.js';

// Get all feature flags
export const getFeatureFlags = async (req: Request, res: Response) => {
  try {
    const flags = await db
      .select()
      .from(superadminFeatureFlags)
      .orderBy(desc(superadminFeatureFlags.created_at));

    res.json({ data: flags });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
};

// Create a new feature flag
export const createFeatureFlag = async (req: Request, res: Response) => {
  try {
    const { name, description, defaultValue, isEnabled = false } = req.body;
    const userId = req.user?.id;

    // Check if feature flag already exists
    const [existingFlag] = await db
      .select()
      .from(superadminFeatureFlags)
      .where(eq(superadminFeatureFlags.name, name));

    if (existingFlag) {
      return res.status(400).json({ error: 'Feature flag with this name already exists' });
    }

    // Create the feature flag
    const [newFlag] = await db
      .insert(superadminFeatureFlags)
      .values({
        name,
        description,
        default_value: defaultValue,
        is_enabled: isEnabled,
        created_by: userId,
      })
      .returning();

    // Log the action
    if (userId) {
      await logSuperadminAction(
        userId,
        'CREATE_FEATURE_FLAG',
        'feature_flag',
        newFlag.id,
        { name, isEnabled, defaultValue }
      );
    }

    res.status(201).json(newFlag);
  } catch (error) {
    console.error('Error creating feature flag:', error);
    res.status(500).json({ error: 'Failed to create feature flag' });
  }
};

// Get feature flag by ID
export const getFeatureFlagById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [flag] = await db
      .select()
      .from(superadminFeatureFlags)
      .where(eq(superadminFeatureFlags.id, id));

    if (!flag) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    res.json(flag);
  } catch (error) {
    console.error('Error fetching feature flag:', error);
    res.status(500).json({ error: 'Failed to fetch feature flag' });
  }
};

// Update feature flag
export const updateFeatureFlag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, defaultValue, isEnabled } = req.body;
    const userId = req.user?.id;

    // Get current flag for logging
    const [currentFlag] = await db
      .select()
      .from(superadminFeatureFlags)
      .where(eq(superadminFeatureFlags.id, id));

    if (!currentFlag) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    // Update the feature flag
    const [updatedFlag] = await db
      .update(superadminFeatureFlags)
      .set({
        name: name ?? currentFlag.name,
        description: description ?? currentFlag.description,
        default_value: defaultValue ?? currentFlag.default_value,
        is_enabled: isEnabled ?? currentFlag.is_enabled,
        updated_at: new Date(),
      })
      .where(eq(superadminFeatureFlags.id, id))
      .returning();

    // Log the action
    if (userId) {
      await logSuperadminAction(
        userId,
        'UPDATE_FEATURE_FLAG',
        'feature_flag',
        id,
        { 
          old: currentFlag,
          new: updatedFlag,
        }
      );
    }

    res.json(updatedFlag);
  } catch (error) {
    console.error('Error updating feature flag:', error);
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
};

// Delete feature flag
export const deleteFeatureFlag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get flag info for logging
    const [flag] = await db
      .select()
      .from(superadminFeatureFlags)
      .where(eq(superadminFeatureFlags.id, id));

    if (!flag) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    // Delete organization-specific overrides first
    await db
      .delete(organizationFeatureFlags)
      .where(eq(organizationFeatureFlags.flag_id, id));

    // Delete the feature flag
    await db
      .delete(superadminFeatureFlags)
      .where(eq(superadminFeatureFlags.id, id));

    // Log the action
    if (userId) {
      await logSuperadminAction(
        userId,
        'DELETE_FEATURE_FLAG',
        'feature_flag',
        id,
        { name: flag.name }
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting feature flag:', error);
    res.status(500).json({ error: 'Failed to delete feature flag' });
  }
};

// Get organization-specific feature flags
export const getOrganizationFeatureFlags = async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    // Check if organization exists
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get all global flags and their overrides for this organization
    const flags = await db
      .select({
        id: superadminFeatureFlags.id,
        name: superadminFeatureFlags.name,
        description: superadminFeatureFlags.description,
        default_value: superadminFeatureFlags.default_value,
        is_enabled: superadminFeatureFlags.is_enabled,
        organization_override: organizationFeatureFlags.is_enabled,
        created_at: superadminFeatureFlags.created_at,
        updated_at: superadminFeatureFlags.updated_at,
      })
      .from(superadminFeatureFlags)
      .leftJoin(
        organizationFeatureFlags,
        and(
          eq(organizationFeatureFlags.flag_id, superadminFeatureFlags.id),
          eq(organizationFeatureFlags.organization_id, organizationId)
        )
      )
      .orderBy(superadminFeatureFlags.name);

    // Format the response
    const formattedFlags = flags.map(flag => ({
      ...flag,
      effective_value: flag.organization_override ?? flag.default_value,
    }));

    res.json({ data: formattedFlags });
  } catch (error) {
    console.error('Error fetching organization feature flags:', error);
    res.status(500).json({ error: 'Failed to fetch organization feature flags' });
  }
};

// Set feature flag for an organization
export const setOrganizationFeatureFlag = async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { flagId, isEnabled } = req.body;
    const userId = req.user?.id;

    // Check if organization exists
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if feature flag exists
    const [flag] = await db
      .select()
      .from(superadminFeatureFlags)
      .where(eq(superadminFeatureFlags.id, flagId));

    if (!flag) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    // Check if override already exists
    const [existingOverride] = await db
      .select()
      .from(organizationFeatureFlags)
      .where(
        and(
          eq(organizationFeatureFlags.organization_id, organizationId),
          eq(organizationFeatureFlags.flag_id, flagId)
        )
      );

    let result;
    
    if (existingOverride) {
      // Update existing override
      [result] = await db
        .update(organizationFeatureFlags)
        .set({
          is_enabled: isEnabled,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(organizationFeatureFlags.organization_id, organizationId),
            eq(organizationFeatureFlags.flag_id, flagId)
          )
        )
        .returning();
    } else {
      // Create new override
      [result] = await db
        .insert(organizationFeatureFlags)
        .values({
          organization_id: organizationId,
          flag_id: flagId,
          is_enabled: isEnabled,
          created_by: userId,
        })
        .returning();
    }

    // Log the action
    if (userId) {
      await logSuperadminAction(
        userId,
        'SET_ORGANIZATION_FEATURE_FLAG',
        'organization_feature_flag',
        result.id,
        { 
          organizationId,
          flagId,
          flagName: flag.name,
          isEnabled,
        }
      );
    }

    res.json(result);
  } catch (error) {
    console.error('Error setting organization feature flag:', error);
    res.status(500).json({ error: 'Failed to set organization feature flag' });
  }
};

// Remove feature flag from an organization
export const removeOrganizationFeatureFlag = async (req: Request, res: Response) => {
  try {
    const { organizationId, flagName } = req.params;
    const userId = req.user?.id;

    // Check if organization exists
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get the flag ID from the name
    const [flag] = await db
      .select()
      .from(superadminFeatureFlags)
      .where(eq(superadminFeatureFlags.name, flagName));

    if (!flag) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    // Delete the override
    const [deletedOverride] = await db
      .delete(organizationFeatureFlags)
      .where(
        and(
          eq(organizationFeatureFlags.organization_id, organizationId),
          eq(organizationFeatureFlags.flag_id, flag.id)
        )
      )
      .returning();

    if (!deletedOverride) {
      return res.status(404).json({ error: 'No override found for this organization and flag' });
    }

    // Log the action
    if (userId) {
      await logSuperadminAction(
        userId,
        'REMOVE_ORGANIZATION_FEATURE_FLAG',
        'organization_feature_flag',
        deletedOverride.id,
        { 
          organizationId,
          flagId: flag.id,
          flagName,
        }
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing organization feature flag:', error);
    res.status(500).json({ error: 'Failed to remove organization feature flag' });
  }
};
