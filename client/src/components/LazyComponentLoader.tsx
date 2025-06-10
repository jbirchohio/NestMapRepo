import { lazy, Suspense, ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Lazy load large components to improve initial bundle size
export const LazyBookingWorkflow = lazy(() => import('./BookingWorkflow'));
export const LazySuperadmin = lazy(() => import('../pages/Superadmin'));
export const LazyCorporateCards = lazy(() => import('../pages/CorporateCards'));
export const LazySequentialBooking = lazy(() => import('../pages/SequentialBooking'));
export const LazyBookingSystem = lazy(() => import('./BookingSystem'));
export const LazyOrganizationFunding = lazy(() => import('../pages/OrganizationFunding'));
export const LazyWhiteLabelSettings = lazy(() => import('./WhiteLabelSettings'));
export const LazyActivityModal = lazy(() => import('./ActivityModal'));
export const LazyOnboardingWizard = lazy(() => import('./OnboardingWizard'));

// Loading fallback component
function LoadingFallback({ componentName }: { componentName?: string }) {
  return (
    <Card className="w-full">
      <CardContent className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">
            {componentName ? `Loading ${componentName}...` : 'Loading...'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// HOC to wrap lazy components with suspense
export function withLazyLoading<T extends {}>(
  LazyComponent: ComponentType<T>,
  componentName?: string
) {
  return function LazyWrapper(props: T) {
    return (
      <Suspense fallback={<LoadingFallback componentName={componentName} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Pre-configured lazy components
export const BookingWorkflowLazy = withLazyLoading(LazyBookingWorkflow, 'Booking Workflow');
export const SuperadminLazy = withLazyLoading(LazySuperadmin, 'Admin Dashboard');
export const CorporateCardsLazy = withLazyLoading(LazyCorporateCards, 'Corporate Cards');
export const SequentialBookingLazy = withLazyLoading(LazySequentialBooking, 'Sequential Booking');
export const BookingSystemLazy = withLazyLoading(LazyBookingSystem, 'Booking System');
export const OrganizationFundingLazy = withLazyLoading(LazyOrganizationFunding, 'Organization Funding');
export const WhiteLabelSettingsLazy = withLazyLoading(LazyWhiteLabelSettings, 'White Label Settings');
export const ActivityModalLazy = withLazyLoading(LazyActivityModal, 'Activity Modal');
export const OnboardingWizardLazy = withLazyLoading(LazyOnboardingWizard, 'Onboarding Wizard');
