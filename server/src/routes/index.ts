import express from 'express';
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

// Optional route modules
let metricsRoutes: any = null;
let voiceRoutes: any = null;
let disruptionAlertsRoutes: any = null;
let offlineRoutes: any = null;
let advancedAnalyticsRoutes: any = null;
let customReportingRoutes: any = null;
let enterpriseIntegrationRoutes: any = null;
let platformEcosystemRoutes: any = null;
let predictiveBusinessIntelligenceRoutes: any = null;
let iotSmartCityRoutes: any = null;
let automationOrchestrationRoutes: any = null;

// Function to safely import routes
async function loadRoutes(): Promise<void> {
  try {
    // Load core routes
    authRoutes = await import('./auth.js').then(m => m.default).catch(() => null);
    userRoutes = await import('./users.js').then(m => m.default).catch(() => null);
    tripRoutes = await import('./trips.js').then(m => m.default).catch(() => null);
    analyticsRoutes = await import('./analytics.js').then(m => m.default).catch(() => null);
    bookingRoutes = await import('./booking.js').then(m => m.default).catch(() => null);
    organizationRoutes = await import('./organization.js').then(m => m.default).catch(() => null);
    
    // Load optional routes
    metricsRoutes = await import('./metrics.js').then(m => m.default).catch(() => null);
    voiceRoutes = await import('./voice.js').then(m => m.default).catch(() => null);
    disruptionAlertsRoutes = await import('./disruption-alerts.js').then(m => m.default).catch(() => null);
    offlineRoutes = await import('./offline.js').then(m => m.default).catch(() => null);
    advancedAnalyticsRoutes = await import('./advanced-analytics.js').then(m => m.default).catch(() => null);
    customReportingRoutes = await import('./custom-reporting.js').then(m => m.default).catch(() => null);
    enterpriseIntegrationRoutes = await import('./enterprise-integration.js').then(m => m.default).catch(() => null);
    platformEcosystemRoutes = await import('./platform-ecosystem.js').then(m => m.default).catch(() => null);
    predictiveBusinessIntelligenceRoutes = await import('./predictive-business-intelligence.js').then(m => m.default).catch(() => null);
    iotSmartCityRoutes = await import('./iot-smart-city.js').then(m => m.default).catch(() => null);
    automationOrchestrationRoutes = await import('./automation-orchestration.js').then(m => m.default).catch(() => null);
  } catch (error) {
    logger.warn('Some routes could not be loaded:', error);
  }
}

export async function setupRoutes(app: any): Promise<void> {
  logger.info('🔧 Setting up API routes...');
  
  // Load all routes first
  await loadRoutes();

  // Public routes (no authentication required)
  if (authRoutes) {
    app.use('/api/auth', authRoutes);
    logger.info('✅ Auth routes registered');
  }
  
  app.use('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Protected routes (authentication required)
  if (userRoutes) {
    app.use('/api/users', authenticate, userRoutes);
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
    app.use('/api/booking', authenticate, bookingRoutes);
    logger.info('✅ Booking routes registered');
  }
  
  if (organizationRoutes) {
    app.use('/api/organization', authenticate, organizationRoutes);
    logger.info('✅ Organization routes registered');
  }

  // Optional routes (if available)
  if (metricsRoutes) {
    app.use('/api/metrics', metricsRoutes);
    logger.info('✅ Metrics routes registered');
  }

  if (voiceRoutes) {
    app.use('/api/voice', authenticate, voiceRoutes);
    logger.info('✅ Voice routes registered');
  }

  if (disruptionAlertsRoutes) {
    app.use('/api/disruption-alerts', authenticate, disruptionAlertsRoutes);
    logger.info('✅ Disruption alerts routes registered');
  }

  if (offlineRoutes) {
    app.use('/api/offline', authenticate, offlineRoutes);
    logger.info('✅ Offline routes registered');
  }

  if (advancedAnalyticsRoutes) {
    app.use('/api/advanced-analytics', authenticate, advancedAnalyticsRoutes);
    logger.info('✅ Advanced analytics routes registered');
  }

  if (customReportingRoutes) {
    app.use('/api/custom-reporting', authenticate, customReportingRoutes);
    logger.info('✅ Custom reporting routes registered');
  }

  if (enterpriseIntegrationRoutes) {
    app.use('/api/enterprise-integration', authenticate, enterpriseIntegrationRoutes);
    logger.info('✅ Enterprise integration routes registered');
  }

  if (platformEcosystemRoutes) {
    app.use('/api/platform-ecosystem', authenticate, platformEcosystemRoutes);
    logger.info('✅ Platform ecosystem routes registered');
  }

  if (predictiveBusinessIntelligenceRoutes) {
    app.use('/api/predictive-business-intelligence', authenticate, predictiveBusinessIntelligenceRoutes);
    logger.info('✅ Predictive business intelligence routes registered');
  }

  if (iotSmartCityRoutes) {
    app.use('/api/iot-smart-city', authenticate, iotSmartCityRoutes);
    logger.info('✅ IoT smart city routes registered');
  }

  if (automationOrchestrationRoutes) {
    app.use('/api/automation-orchestration', authenticate, automationOrchestrationRoutes);
    logger.info('✅ Automation orchestration routes registered');
  }

  logger.info('✅ All available routes registered successfully');
}
