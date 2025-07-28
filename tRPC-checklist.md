# tRPC Migration Checklist

This checklist lists all tasks required to fully migrate the project from the existing Express REST API to tRPC. Every file that relies on the current REST architecture is enumerated so it can be migrated and removed. No gradual rollout will take place; all routes and client calls will be converted in one sweep.

1. **Install tRPC dependencies**
   1.1. Add server and client libraries
       1.1.1. Run from repository root: `pnpm add -w @trpc/server @trpc/client @trpc/react-query @trpc/server/adapters/express zod`
           1.1.1.1. Commit updated `package.json` and lock file
       1.1.2. Install dev dependency `@trpc/react-query@latest`
           1.1.2.1. Commit changes
   1.2. Verify packages compile with existing code
       1.2.1. Run `pnpm install && pnpm lint`
           1.2.1.1. Resolve any conflicts from new packages

2. **Set up server-side tRPC**
   2.1. Create context and router infrastructure
       2.1.1. Add `server/src/trpc/context.ts` and `server/src/trpc/routers/index.ts`
           2.1.1.1. Export `AppRouter` and helper `t`
   2.2. Integrate middleware
       2.2.1. Update `server/src/app.ts` to mount tRPC with `createExpressMiddleware`
           2.2.1.1. Remove old dynamic route setup once all routes are migrated
   2.3. Convert existing Express routes to tRPC
       2.3.1. For each file under `server/src/routes` convert the handlers to a router and then delete the file
           - server/src/routes/activities.ts
           - server/src/routes/admin-analytics.ts
           - server/src/routes/admin-settings.ts
           - server/src/routes/admin.ts
           - server/src/routes/ai-assistant.ts
           - server/src/routes/ai-routes.ts
           - server/src/routes/ai.ts
           - server/src/routes/alerts.ts
           - server/src/routes/analytics.ts
           - server/src/routes/approvals.ts
           - server/src/routes/auth.ts
           - server/src/routes/autonomous-vehicles.ts
           - server/src/routes/billing.ts
           - server/src/routes/bookings.ts
           - server/src/routes/branding.ts
           - server/src/routes/budgets.ts
           - server/src/routes/calendar.ts
           - server/src/routes/collaboration.ts
           - server/src/routes/communication.ts
           - server/src/routes/compliance.ts
           - server/src/routes/comprehensive-routes.ts
           - server/src/routes/corporate-cards.ts
           - server/src/routes/corporateCards.ts
           - server/src/routes/custom-reporting.ts
           - server/src/routes/customDomains.ts
           - server/src/routes/domains.ts
           - server/src/routes/errors.ts
           - server/src/routes/expenses.ts
           - server/src/routes/export.ts
           - server/src/routes/flights.ts
           - server/src/routes/health.ts
           - server/src/routes/hotels.ts
           - server/src/routes/index.ts
           - server/src/routes/invoices.ts
           - server/src/routes/localization.ts
           - server/src/routes/locations.ts
           - server/src/routes/metrics.ts
           - server/src/routes/mfa.ts
           - server/src/routes/notes.ts
           - server/src/routes/notifications.ts
           - server/src/routes/onboarding-feedback.ts
           - server/src/routes/organizationFunding.ts
           - server/src/routes/organizationMembers.ts
           - server/src/routes/organizations.ts
           - server/src/routes/payments.ts
           - server/src/routes/performance.ts
           - server/src/routes/policies.ts
           - server/src/routes/proposals.ts
           - server/src/routes/reimbursements.ts
           - server/src/routes/reporting.ts
           - server/src/routes/security.ts
           - server/src/routes/stripeOAuth.ts
           - server/src/routes/subscription-status.ts
           - server/src/routes/system-metrics.ts
           - server/src/routes/templates.ts
           - server/src/routes/test.routes.ts
           - server/src/routes/todos.ts
           - server/src/routes/trips.ts
           - server/src/routes/user-management.ts
           - server/src/routes/user.ts
           - server/src/routes/voice.ts
           - server/src/routes/weather.ts
           - server/src/routes/webhooks.ts
           - server/src/routes/whiteLabelSimplified.ts
           - server/src/routes/whiteLabelStatus.ts
       2.3.2. Convert `server/src/auth` modules to routers
           - server/src/auth/auth.container.ts
           - server/src/auth/auth.controller.ts
           - server/src/auth/auth.module.ts
           - server/src/auth/auth.routes.ts
           - server/src/auth/auth.service.ts
           - server/src/auth/index.ts
       2.3.3. Remove any route references from `server/src/routes/index.ts`
           2.3.3.1. Delete `server/src/routes/index.ts` after migration

3. **Update the client to use tRPC**
   3.1. Create tRPC React client instance
       3.1.1. Add `client/src/lib/trpc.ts` exporting `trpc` from `createTRPCReact`
           3.1.1.1. Reference `AppRouter`
   3.2. Integrate provider
       3.2.1. Modify `client/src/main.tsx` to include `<trpc.Provider>` and `<QueryClientProvider>`
           3.2.1.1. Initialize `httpBatchLink` with `/trpc` url
   3.3. Replace REST calls with tRPC hooks
       3.3.1. Update these files to replace `fetch`/`axios` calls with tRPC procedures and then remove REST logic
           - client/src/hooks/useOptimizedQuery.ts
           - client/src/hooks/useNotifications.ts
           - client/src/hooks/useTrips.ts
           - client/src/hooks/useRolePermissions.ts
           - client/src/hooks/useAnalytics.ts
           - client/src/hooks/useMobileFeatures.tsx
           - client/src/hooks/useAIAssistant.ts
           - client/src/lib/jwtAuth.ts
           - client/src/lib/constants.ts
           - client/src/components/onboarding/FeedbackSurvey.tsx
           - client/src/components/NewTripModal.tsx
           - client/src/components/PlatformMarketplace.tsx
           - client/src/components/CalendarIntegration.tsx
           - client/src/components/booking/steps/FlightSelectionStep.tsx
           - client/src/components/booking/steps/HotelSelectionStep.tsx
           - client/src/components/booking/services/bookingService.ts
           - client/src/components/VoiceInterface.tsx
           - client/src/components/WhiteLabelAccessControl.tsx
           - client/src/components/EnterpriseIntegrationDashboard.tsx
           - client/src/components/OnboardingWizard.tsx
           - client/src/components/compliance/PolicyCompliancePanel.tsx
           - client/src/components/AutonomousVehicleBooking.tsx
           - client/src/components/CorporateTripOptimizer.tsx
           - client/src/components/CarbonExpenseTracker.tsx
           - client/src/components/BookingSystem.tsx
           - client/src/components/RoleManagement.tsx
           - client/src/components/CustomReportBuilder.tsx
           - client/src/components/ProposalGenerator.tsx
           - client/src/components/TripTemplates.tsx
           - client/src/components/SmartCityDashboard.tsx
           - client/src/components/AlertNotifications.tsx
           - client/src/components/approvals/ApprovalWorkflowPanel.tsx
           - client/src/components/admin/CorporateCardManagement.tsx
           - client/src/components/admin/SpendPolicyManagement.tsx
           - client/src/components/admin/UserManagement.tsx
           - client/src/components/admin/ReimbursementProcessing.tsx
           - client/src/components/admin/BudgetManagement.tsx
           - client/src/components/SmartOptimizer.tsx
           - client/src/components/AnalyticsDashboard.tsx
           - client/src/components/PredictiveInsights.tsx
           - client/src/components/security/MFASetup.tsx
           - client/src/components/DomainManagement.tsx
           - client/src/components/AITripGenerator.tsx
           - client/src/components/BookingWorkflow.tsx
           - client/src/components/TripTeamManagement.tsx
           - client/src/components/PlacesSearch.tsx
           - client/src/components/RoleBasedRedirect.tsx
           - client/src/components/PdfExport.tsx
           - client/src/components/NotificationCenter.tsx
           - client/src/components/BillingDashboard.tsx
           - client/src/components/SystemStatusIndicator.tsx
           - client/src/components/ShareRedirectHandler.tsx
           - client/src/components/TeamManagement.tsx
           - client/src/components/ItinerarySidebar.tsx
           - client/src/components/AutomationWorkflowBuilder.tsx
           - client/src/components/BrandingOnboarding.tsx
           - client/src/pages/Analytics.tsx
           - client/src/pages/BookingConfirmation.tsx
           - client/src/pages/EnterpriseDashboard.tsx
           - client/src/pages/AdminRoles.tsx
           - client/src/pages/SimpleShare.tsx
           - client/src/pages/WhiteLabelDashboard.tsx
           - client/src/pages/AdminUserActivity.tsx
           - client/src/pages/SequentialBooking.tsx
           - client/src/pages/InvoiceCenter.tsx
           - client/src/pages/SuperadminOrganizationDetail.tsx
           - client/src/pages/OrganizationFunding.tsx
           - client/src/pages/ProposalTemplates.tsx
           - client/src/pages/ProposalCenter.tsx
           - client/src/pages/Settings.tsx
           - client/src/pages/Dashboard.tsx
           - client/src/pages/SequentialBookingFlights.tsx
           - client/src/pages/AgencyDashboard.tsx
           - client/src/pages/ProfileSettings.tsx
           - client/src/pages/CorporateCards.tsx
           - client/src/pages/FlightSearch.tsx
           - client/src/pages/ProposalAnalytics.tsx
           - client/src/pages/PerformanceDashboard.tsx
           - client/src/pages/AdminSystemMetrics.tsx
           - client/src/pages/CorporateDashboard.tsx
           - client/src/pages/BrandingSetup.tsx
           - client/src/pages/AdminSecurity.tsx
           - client/src/pages/SharedTrip.tsx
           - client/src/pages/TripPlanner.tsx
           - client/src/pages/FlightResults.tsx
           - client/src/pages/WhiteLabelDomains.tsx
           - client/src/pages/CorporateCardsManagement.tsx
           - client/src/pages/PublicProposal.tsx
           - client/src/pages/Approvals.tsx
           - client/src/pages/FlightBooking.tsx
           - client/src/pages/TripOptimizer.tsx
           - client/src/pages/Bookings.tsx
           - client/src/pages/AdminSettings.tsx
           - client/src/pages/AdminDashboard.tsx
           - client/src/pages/AdminLogs.tsx
           - client/src/pages/InvoiceView.tsx
           - client/src/pages/SuperadminClean.tsx
           - client/src/services/api/userService.ts
           - client/src/services/api/metricsService.ts
           - client/src/services/api/interceptors/auth.ts
           - client/src/services/tripService.ts
           - client/src/providers/AuthProvider.tsx
           - client/src/contexts/WhiteLabelContext.tsx
           - client/src/contexts/OnboardingContext.tsx
           - client/src/utils/advancedCache.ts
           - client/src/utils/logger.ts
           - client/src/utils/performanceMonitor.ts
           - client/src/utils/errorLogger.ts
           - client/src/utils/errorHandler.ts
       3.3.2. Remove API client utilities
           3.3.2.1. Delete `client/src/lib/apiClient.ts`
           3.3.2.2. Delete `client/src/services/api/apiClient.ts`
           3.3.2.3. Delete `client/src/services/api/apiClientV2.ts`
           3.3.2.4. Delete tests under `client/src/services/api/__tests__/`

4. **Clean up and finalize**
   4.1. Remove all deprecated Express files after conversion
       4.1.1. Delete REST middleware no longer used
           4.1.1.1. Search `server/src/middleware` for unused handlers
   4.2. Update tests to use tRPC caller utilities
       4.2.1. Modify Jest setup in `tests` workspace
           4.2.1.1. Ensure integration tests cover tRPC endpoints
   4.3. Update documentation and deployment scripts
       4.3.1. Document `/trpc` endpoint and new setup in README
           4.3.1.1. Update CI/CD pipeline to start server with tRPC

