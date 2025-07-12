import { Router } from 'express';
import { requireSuperadmin } from '../../shared/src/schema.js';
import * as featureFlagsController from './controllers.js';
import * as featureFlagsValidators from './validators.js';

const router = Router();

// Get all feature flags (global and organization-specific)
router.get('/', requireSuperadmin, featureFlagsController.getFeatureFlags);

// Create a new feature flag
export const createFeatureFlag = [
  requireSuperadmin,
  featureFlagsValidators.validateCreateFeatureFlag,
  featureFlagsController.createFeatureFlag,
];

// Update a feature flag
export const updateFeatureFlag = [
  requireSuperadmin,
  featureFlagsValidators.validateFeatureFlagId,
  featureFlagsValidators.validateUpdateFeatureFlag,
  featureFlagsController.updateFeatureFlag,
];

// Delete a feature flag
export const deleteFeatureFlag = [
  requireSuperadmin,
  featureFlagsValidators.validateFeatureFlagId,
  featureFlagsController.deleteFeatureFlag,
];

// Get feature flag by ID
export const getFeatureFlagById = [
  requireSuperadmin,
  featureFlagsValidators.validateFeatureFlagId,
  featureFlagsController.getFeatureFlagById,
];

// Get organization-specific feature flags
export const getOrganizationFeatureFlags = [
  requireSuperadmin,
  featureFlagsValidators.validateOrganizationId,
  featureFlagsController.getOrganizationFeatureFlags,
];

// Set feature flag for an organization
export const setOrganizationFeatureFlag = [
  requireSuperadmin,
  featureFlagsValidators.validateOrganizationId,
  featureFlagsValidators.validateSetOrganizationFeatureFlag,
  featureFlagsController.setOrganizationFeatureFlag,
];

// Remove feature flag from an organization
export const removeOrganizationFeatureFlag = [
  requireSuperadmin,
  featureFlagsValidators.validateOrganizationId,
  featureFlagsValidators.validateFeatureFlagName,
  featureFlagsController.removeOrganizationFeatureFlag,
];

// Apply routes
router.post('/', ...createFeatureFlag);
router.get('/:id', ...getFeatureFlagById);
router.put('/:id', ...updateFeatureFlag);
router.delete('/:id', ...deleteFeatureFlag);

// Organization-specific routes
router.get('/organizations/:organizationId', ...getOrganizationFeatureFlags);
router.post('/organizations/:organizationId/flags', ...setOrganizationFeatureFlag);
router.delete('/organizations/:organizationId/flags/:flagName', ...removeOrganizationFeatureFlag);

export default router;
