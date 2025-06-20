import { Router } from 'express';
import { requireSuperadmin } from '../../../middleware/superadmin.js';
import * as billingController from './controllers.js';
import * as billingValidators from './validators.js';

const router = Router();

// Get billing overview
router.get('/', requireSuperadmin, billingController.getBillingOverview);

// Get billing details for an organization
router.get(
  '/:organizationId',
  requireSuperadmin,
  billingValidators.validateOrganizationId,
  billingController.getOrganizationBilling
);

// Update subscription plan
router.post(
  '/:organizationId/plan',
  requireSuperadmin,
  billingValidators.validateOrganizationId,
  billingValidators.updatePlan,
  billingController.updateSubscriptionPlan
);

// Apply coupon/discount
router.post(
  '/:organizationId/coupon',
  requireSuperadmin,
  billingValidators.validateOrganizationId,
  billingValidators.applyCoupon,
  billingController.applyCoupon
);

// Get payment methods
router.get(
  '/:organizationId/payment-methods',
  requireSuperadmin,
  billingValidators.validateOrganizationId,
  billingController.getPaymentMethods
);

// Add payment method
router.post(
  '/:organizationId/payment-methods',
  requireSuperadmin,
  billingValidators.validateOrganizationId,
  billingValidators.addPaymentMethod,
  billingController.addPaymentMethod
);

// Set default payment method
router.post(
  '/:organizationId/payment-methods/default',
  requireSuperadmin,
  billingValidators.validateOrganizationId,
  billingValidators.setDefaultPaymentMethod,
  billingController.setDefaultPaymentMethod
);

// Get invoices
router.get(
  '/:organizationId/invoices',
  requireSuperadmin,
  billingValidators.validateOrganizationId,
  billingController.getInvoices
);

export default router;
