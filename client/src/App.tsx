import { Suspense, lazy } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { WhiteLabelProvider } from '@/contexts/WhiteLabelContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import OnboardingManager from '@/components/onboarding/OnboardingManager';

// Lazy load pages for better performance
const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const MainLayout = lazy(() => import('@/layouts/MainLayout'));

// Import Phase 1-3 Components
import VoiceAssistant from '@/pages/VoiceAssistant';
import EnterpriseIntegrationDashboard from '@/components/EnterpriseIntegrationDashboard';
import CustomReportBuilder from '@/components/CustomReportBuilder';
import SmartCityDashboard from '@/components/SmartCityDashboard';
import PlatformMarketplace from '@/components/PlatformMarketplace';
import AutonomousVehicleBooking from '@/components/AutonomousVehicleBooking';
import AutomationWorkflowBuilder from '@/components/AutomationWorkflowBuilder';

// Loading component for Suspense fallback
const PageLoading = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <LoadingSpinner size="lg" />
  </div>
);

// Protected Route Component
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    // Redirect to login page with the return url
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  return <Outlet />;
};

// Public Only Route Component (for login/signup when already authenticated)
const PublicOnlyRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoading />;
  }

  if (isAuthenticated) {
    // Redirect to dashboard if already authenticated
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

// Main App Component
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <OnboardingProvider>
            <TooltipProvider>
              <WhiteLabelProvider>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoading />}>
                    <Routes>
                      {/* Public routes */}
                      <Route path="/" element={<MainLayout><Home /></MainLayout>} />
                      
                      {/* Auth routes - only accessible when not logged in */}
                      <Route element={<PublicOnlyRoute />}>
                        <Route path="/login" element={<MainLayout hideNav><Login /></MainLayout>} />
                      </Route>
                      
                      {/* Protected routes - require authentication */}
                      <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
                        
                        {/* Phase 1: Voice Interface & AI Features */}
                        <Route path="/voice-assistant" element={<MainLayout><VoiceAssistant /></MainLayout>} />
                        
                        {/* Phase 2: Enterprise Integration & Reporting */}
                        <Route path="/enterprise-integration" element={<MainLayout><EnterpriseIntegrationDashboard /></MainLayout>} />
                        <Route path="/custom-reports" element={<MainLayout><CustomReportBuilder /></MainLayout>} />
                        
                        {/* Phase 3: Smart City & Advanced Features */}
                        <Route path="/smart-city" element={<MainLayout><SmartCityDashboard /></MainLayout>} />
                        <Route path="/marketplace" element={<MainLayout><PlatformMarketplace /></MainLayout>} />
                        <Route path="/autonomous-vehicles" element={<MainLayout><AutonomousVehicleBooking /></MainLayout>} />
                        <Route path="/automation" element={<MainLayout><AutomationWorkflowBuilder /></MainLayout>} />
                      </Route>
                      
                      {/* 404 Not Found */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                  <Toaster />
                  <OnboardingManager />
                </ErrorBoundary>
              </WhiteLabelProvider>
            </TooltipProvider>
          </OnboardingProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
