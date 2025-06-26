

import { lazy, Suspense, ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Lazy load large components to improve initial bundle size
const lazyWithRetry = <T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  componentName: string
) => {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.error(`Failed to load component ${componentName}:`, error);
      throw error;
    }
  });
};

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// Define component props interfaces
export interface OnboardingWizardProps {
  onComplete: () => void;
}

// Export lazy-loaded components
export const LazyBookingWorkflow = lazyWithRetry<{}>(() => import('./BookingWorkflow'), 'BookingWorkflow');
export const LazySuperadmin = lazyWithRetry<{}>(() => import('../pages/SuperadminClean'), 'SuperadminClean');
export const LazyCorporateCards = lazyWithRetry<{}>(() => import('../pages/CorporateCards'), 'CorporateCards');
export const LazySequentialBooking = lazyWithRetry<{}>(() => import('../pages/SequentialBookingFlights'), 'SequentialBookingFlights');

type BookingSystemProps = {
  // Add specific props for BookingSystem if needed
};

export const LazyBookingSystem = lazyWithRetry<BookingSystemProps>(
  () => import('../pages/BookingSystem'),
  'BookingSystem'
);

export const LazyOrganizationFunding = lazyWithRetry<{}>(
  () => import('../pages/OrganizationFunding'),
  'OrganizationFunding'
);

export const LazyWhiteLabelSettings = lazyWithRetry<{}>(
  () => import('../pages/WhiteLabelSettings'),
  'WhiteLabelSettings'
);

export const LazyActivityModal = lazyWithRetry<{}>(
  () => import('../components/ActivityModal'),
  'ActivityModal'
);

export const LazyOnboardingWizard = lazyWithRetry<OnboardingWizardProps>(
  () => import('../components/OnboardingWizard'),
  'OnboardingWizard'
) as React.LazyExoticComponent<React.ComponentType<OnboardingWizardProps>>;

// Loading fallback component
function LoadingFallback({ componentName }: {
    componentName?: string;
}) {
    return (<Card className="w-full">
      <CardContent className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">
            {componentName ? `Loading ${componentName}...` : 'Loading...'}
          </span>
        </div>
      </CardContent>
    </Card>);
}
// HOC to wrap lazy components with suspense
export function withLazyLoading<T extends {}>(LazyComponent: ComponentType<T>, componentName?: string) {
    return function LazyWrapper(props: T) {
        return (<Suspense fallback={<LoadingFallback componentName={componentName}/>}>
        <LazyComponent {...props}/>
      </Suspense>);
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
