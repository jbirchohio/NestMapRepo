import { Router } from 'express.js';
import { requireSuperadmin } from '../../../middleware/superadmin.js.js';
import * as usersController from './controllers.js';
import * as usersValidators from './validators.js';

const router = Router();

// Get all users with filtering and pagination
router.get('/', requireSuperadmin, usersController.getUsers);

// Get single user
router.get(
  '/:id',
  requireSuperadmin,
  usersValidators.validateUserId,
  usersController.getUser
);

// Create new user
router.post(
  '/',
  requireSuperadmin,
  usersValidators.createUser,
  usersController.createUser
);

// Update user
router.put(
  '/:id',
  requireSuperadmin,
  usersValidators.validateUserId,
  usersValidators.updateUser,
  usersController.updateUser
);

// Delete user
router.delete(
  '/:id',
  requireSuperadmin,
  usersValidators.validateUserId,
  usersController.deleteUser
);

// Get user sessions
router.get(
  '/:id/sessions',
  requireSuperadmin,
  usersValidators.validateUserId,
  usersController.getUserSessions
);

export default router;
