import { Router } from 'express';
import { requireSuperadmin } from '../../shared/src/schema.js';
import { validateOrganizationAccess } from '../../shared/src/schema.js';
import * as organizationsController from './controllers.js';
import * as organizationsValidators from './validators.js';

const router = Router();

// Get all organizations
router.get('/', requireSuperadmin, organizationsController.getOrganizations);

// Get single organization
router.get(
  '/:id',
  requireSuperadmin,
  validateOrganizationAccess,
  organizationsController.getOrganization
);

// Create new organization
router.post(
  '/',
  requireSuperadmin,
  organizationsValidators.createOrganization,
  organizationsController.createOrganization
);

// Update organization
router.put(
  '/:id',
  requireSuperadmin,
  validateOrganizationAccess,
  organizationsValidators.updateOrganization,
  organizationsController.updateOrganization
);

// Delete organization
router.delete(
  '/:id',
  requireSuperadmin,
  validateOrganizationAccess,
  organizationsController.deleteOrganization
);

export default router;
