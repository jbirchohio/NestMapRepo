import { logger } from '../utils/logger.js';

// Import authentication middleware
import { authenticateJWT as authenticate } from '../middleware/auth.js';

// Core route modules (these should exist)
let authRoutes: any = null;
let userRoutes: any = null;
let tripRoutes: any = null;
let analyticsRoutes: any = null;
let bookingRoutes: any = null;
let organizationRoutes: any = null;
let adminRoutes: any = null;
let approvalRoutes: any = null;
let invoiceRoutes: any = null;
let corporateCardRoutes: any = null;
let budgetRoutes: any = null;
let userManagementRoutes: any = null;
let reimbursementRoutes: any = null;

// Optional route modules
let metricsRoutes: any = null;
let voiceRoutes: any = null;
let aiAssistantRoutes: any = null;
let policiesRoutes: any = null;
let weatherRoutes: any = null;
let customReportingRoutes: any = null;
let flightRoutes: any = null;
let autonomousVehicleRoutes: any = null;

// Newly migrated route modules
let notificationsRoutes: any = null;
let expensesRoutes: any = null;
let activitiesRoutes: any = null;
let customDomainsRoutes: any = null;
let onboardingFeedbackRoutes: any = null;
let alertsRoutes: any = null;
let securityRoutes: any = null;
let proposalsRoutes: any = null;
let paymentsRoutes: any = null;
let billingRoutes: any = null;
let calendarRoutes: any = null;
let webhooksRoutes: any = null;
let mfaRoutes: any = null;
let complianceRoutes: any = null;
let localizationRoutes: any = null;
let communicationRoutes: any = null;
let errorsRoutes: any = null;
let exportRoutes: any = null;
let templatesRoutes: any = null;
let hotelsRoutes: any = null;
let locationsRoutes: any = null;
let todosRoutes: any = null;
let notesRoutes: any = null;

// Function to safely import routes
async function loadRoutes(): Promise<void> {
  try {
    // Helper function to check if Jest is tearing down
    const isJestTeardown = () => {
      return process.env.NODE_ENV === 'test' && (
        (global as any).__JEST_TEARDOWN_IN_PROGRESS__ ||
        process.exitCode !== undefined
      );
    };

    // Check if Jest is in teardown mode to prevent import errors
    if (isJestTeardown()) {
      console.log('DEBUG: Jest teardown detected, skipping route loading');
      return;
    }

    // Load core routes with teardown checks between imports
    authRoutes = await import('./auth.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load auth routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    userRoutes = await import('./user.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load user routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    tripRoutes = await import('./trips.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load trips routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    analyticsRoutes = await import('./analytics.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load analytics routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    bookingRoutes = await import('./bookings.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load bookings routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    organizationRoutes = await import('./organizations.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load organizations routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    adminRoutes = await import('./admin.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load admin routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    approvalRoutes = await import('./approvals.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load approval routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    invoiceRoutes = await import('./invoices.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load invoice routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    corporateCardRoutes = await import('./corporate-cards.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load corporate-card routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    budgetRoutes = await import('./budgets.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load budget routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    userManagementRoutes = await import('./user-management.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load user-management routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    reimbursementRoutes = await import('./reimbursements.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load reimbursement routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    // Load optional routes
    metricsRoutes = await import('./metrics.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load metrics routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    console.log('DEBUG: About to load voice routes...');
    voiceRoutes = await import('./voice.js').then(m => { console.log('DEBUG: Voice routes loaded successfully:', !!m?.default); return m.default; }).catch((e) => { console.log('ERROR: Failed to load voice routes:', e?.message, e?.stack); return null; });
    if (isJestTeardown()) return;
    
    aiAssistantRoutes = await import('./ai-assistant.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load ai-assistant routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    policiesRoutes = await import('./policies.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load policies routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    weatherRoutes = await import('./weather.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load weather routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    customReportingRoutes = await import('./custom-reporting.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load custom-reporting routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    flightRoutes = await import('./flights.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load flights routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    autonomousVehicleRoutes = await import('./autonomous-vehicles.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load autonomous-vehicles routes:', e?.message); return null; });
    
    // Load newly migrated routes
    notificationsRoutes = await import('./notifications.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load notifications routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    expensesRoutes = await import('./expenses.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load expenses routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    activitiesRoutes = await import('./activities.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load activities routes:', e?.message); return null; });
    if (isJestTeardown()) return;
    
    customDomainsRoutes = await import('./customDomains.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load customDomains routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    onboardingFeedbackRoutes = await import('./onboarding-feedback.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load onboarding-feedback routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    alertsRoutes = await import('./alerts.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load alerts routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    securityRoutes = await import('./security.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load security routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    proposalsRoutes = await import('./proposals.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load proposals routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    paymentsRoutes = await import('./payments.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load payments routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    billingRoutes = await import('./billing.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load billing routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    calendarRoutes = await import('./calendar.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load calendar routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    webhooksRoutes = await import('./webhooks.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load webhooks routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    mfaRoutes = await import('./mfa.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load mfa routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    complianceRoutes = await import('./compliance.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load compliance routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    localizationRoutes = await import('./localization.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load localization routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    communicationRoutes = await import('./communication.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load communication routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    errorsRoutes = await import('./errors.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load errors routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    exportRoutes = await import('./export.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load export routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    templatesRoutes = await import('./templates.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load templates routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    hotelsRoutes = await import('./hotels.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load hotels routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    locationsRoutes = await import('./locations.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load locations routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    todosRoutes = await import('./todos.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load todos routes:', e?.message); return null; });
    if (isJestTeardown()) return;

    notesRoutes = await import('./notes.js').then(m => m.default).catch((e) => { if (process.env.NODE_ENV !== 'test') console.log('Failed to load notes routes:', e?.message); return null; });
    if (isJestTeardown()) return;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      logger.warn('Some routes could not be loaded:', error);
    }
  }
}

export async function setupRoutes(app: any): Promise<void> {
  logger.info('🔧 Setting up API routes...');
  
  // Load all routes first
  await loadRoutes();

  console.log('DEBUG: Route loading status:');
  console.log('- authRoutes:', !!authRoutes);
  console.log('- voiceRoutes:', !!voiceRoutes);
  console.log('- userRoutes:', !!userRoutes);

  // Public routes (no authentication required)
  if (authRoutes) {
    app.use('/api/auth', authRoutes);
    logger.info('✅ Auth routes registered');
  } else {
    console.log('❌ Auth routes NOT registered - authRoutes is falsy');
  }
  
  app.use('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Protected routes (authentication required)
  if (adminRoutes) {
    app.use('/api/admin', authenticate, adminRoutes);
    logger.info('✅ Admin routes registered');
  }

  if (userRoutes) {
    app.use('/api/user', authenticate, userRoutes);
    logger.info('✅ User routes registered');
  }
  
  if (tripRoutes) {
    app.use('/api/trips', authenticate, tripRoutes);
    logger.info('✅ Trip routes registered');
  }
  
  if (analyticsRoutes) {
    app.use('/api/analytics', authenticate, analyticsRoutes);
    logger.info('✅ Analytics routes registered');
  }
  
  if (bookingRoutes) {
    app.use('/api/bookings', authenticate, bookingRoutes);
    logger.info('✅ Booking routes registered');
  }
  
  if (organizationRoutes) {
    app.use('/api/organizations', authenticate, organizationRoutes);
    logger.info('✅ Organization routes registered');
  }

  if (approvalRoutes) {
    app.use('/api/approvals', authenticate, approvalRoutes);
    logger.info('✅ Approval routes registered');
  }

  if (invoiceRoutes) {
    app.use('/api/invoices', authenticate, invoiceRoutes);
    logger.info('✅ Invoice routes registered');
  }

  if (corporateCardRoutes) {
    app.use('/api/corporate-cards', authenticate, corporateCardRoutes);
    logger.info('✅ Corporate card routes registered');
  }

  if (budgetRoutes) {
    app.use('/api/budgets', authenticate, budgetRoutes);
    logger.info('✅ Budget routes registered');
  }

  if (userManagementRoutes) {
    app.use('/api/user-management', authenticate, userManagementRoutes);
    logger.info('✅ User management routes registered');
  }

  if (reimbursementRoutes) {
    app.use('/api/reimbursements', authenticate, reimbursementRoutes);
    logger.info('✅ Reimbursement routes registered');
  }

  // Optional routes (if available)
  if (metricsRoutes) {
    app.use('/api/metrics', metricsRoutes);
    logger.info('✅ Metrics routes registered');
  }

  console.log('DEBUG: voiceRoutes value:', voiceRoutes, typeof voiceRoutes);
  if (voiceRoutes) {
    app.use('/api/voice', authenticate, voiceRoutes);
    logger.info('✅ Voice routes registered');
  } else {
    console.log('DEBUG: Voice routes is falsy, not registering');
  }

  if (aiAssistantRoutes) {
    app.use('/api/ai-assistant', authenticate, aiAssistantRoutes);
    logger.info('✅ AI Assistant routes registered');
  }

  if (policiesRoutes) {
    app.use('/api/policies', authenticate, policiesRoutes);
    logger.info('✅ Policies routes registered');
  }

  if (weatherRoutes) {
    app.use('/api/weather', authenticate, weatherRoutes);
    logger.info('✅ Weather routes registered');
  }

  if (flightRoutes) {
    app.use('/api/flights', authenticate, flightRoutes);
    logger.info('✅ Flight routes registered');
  }

  if (customReportingRoutes) {
    app.use('/api/custom-reporting', authenticate, customReportingRoutes);
    logger.info('✅ Custom reporting routes registered');
  }

  if (autonomousVehicleRoutes) {
    app.use('/api/autonomous-vehicles', authenticate, autonomousVehicleRoutes);
    logger.info('✅ Autonomous vehicle routes registered');
  }

  // Newly migrated routes
  if (notificationsRoutes) {
    app.use('/api/notifications', authenticate, notificationsRoutes);
    logger.info('✅ Notifications routes registered');
  }

  if (expensesRoutes) {
    app.use('/api/expenses', authenticate, expensesRoutes);
    logger.info('✅ Expenses routes registered');
  }

  if (activitiesRoutes) {
    app.use('/api/activities', authenticate, activitiesRoutes);
    logger.info('✅ Activities routes registered');
  }

  if (customDomainsRoutes) {
    app.use('/api/domains', authenticate, customDomainsRoutes);
    logger.info('✅ Custom domains routes registered');
  }

  if (onboardingFeedbackRoutes) {
    app.use('/api/onboarding-feedback', onboardingFeedbackRoutes); // No auth needed for feedback
    logger.info('✅ Onboarding feedback routes registered');
  }

  if (alertsRoutes) {
    app.use('/api/alerts', authenticate, alertsRoutes);
    logger.info('✅ Alerts routes registered');
  }

  if (securityRoutes) {
    app.use('/api/security', securityRoutes); // Security events may not need auth
    logger.info('✅ Security routes registered');
  }

  if (proposalsRoutes) {
    app.use('/api/proposals', authenticate, proposalsRoutes);
    logger.info('✅ Proposals routes registered');
  }

  if (paymentsRoutes) {
    app.use('/api/payments', authenticate, paymentsRoutes);
    logger.info('✅ Payments routes registered');
  }

  if (billingRoutes) {
    app.use('/api/billing', authenticate, billingRoutes);
    logger.info('✅ Billing routes registered');
  }

  if (calendarRoutes) {
    app.use('/api/calendar', authenticate, calendarRoutes);
    logger.info('✅ Calendar routes registered');
  }

  if (webhooksRoutes) {
    app.use('/api/webhooks', webhooksRoutes); // Webhooks typically don't need auth
    logger.info('✅ Webhooks routes registered');
  }

  if (mfaRoutes) {
    app.use('/api/mfa', authenticate, mfaRoutes);
    logger.info('✅ MFA routes registered');
  }

  if (complianceRoutes) {
    app.use('/api/compliance', authenticate, complianceRoutes);
    logger.info('✅ Compliance routes registered');
  }

  if (localizationRoutes) {
    app.use('/api/localization', localizationRoutes); // Localization may not need auth
    logger.info('✅ Localization routes registered');
  }

  if (communicationRoutes) {
    app.use('/api/communication', authenticate, communicationRoutes);
    logger.info('✅ Communication routes registered');
  }

  if (errorsRoutes) {
    app.use('/api/errors', errorsRoutes); // Error logging may not need auth
    logger.info('✅ Errors routes registered');
  }

  if (exportRoutes) {
    app.use('/api/export', authenticate, exportRoutes);
    logger.info('✅ Export routes registered');
  }

  if (templatesRoutes) {
    app.use('/api/templates', templatesRoutes); // Templates may not need auth
    logger.info('✅ Templates routes registered');
  }

  if (hotelsRoutes) {
    app.use('/api/hotels', authenticate, hotelsRoutes);
    logger.info('✅ Hotels routes registered');
  }

  if (locationsRoutes) {
    app.use('/api/locations', authenticate, locationsRoutes);
    logger.info('✅ Locations routes registered');
  }

  if (todosRoutes) {
    app.use('/api/todos', authenticate, todosRoutes);
    logger.info('✅ Todos routes registered');
  }

  if (notesRoutes) {
    app.use('/api/notes', authenticate, notesRoutes);
    logger.info('✅ Notes routes registered');
  }

  logger.info('✅ All available routes registered successfully');
}

