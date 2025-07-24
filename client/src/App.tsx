import React, { Suspense, lazy } from 'react';
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
import { publicRoutes, protectedRoutes, adminRoutes, superadminRoutes, notFoundRoute } from '@/config/routes';

// Lazy load core pages
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

// Protected Route Component with Role Check
const ProtectedRoute = ({ roles }: { roles?: string[] }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    // Redirect to login page with the return url
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  // Check role-based access
  if (roles && user?.role && !roles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = user.role === 'super_admin' ? '/superadmin' : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};

// Public Only Route Component (for login/signup when already authenticated)
const PublicOnlyRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <PageLoading />;
  }

  if (isAuthenticated) {
    // Redirect based on user role
    const redirectPath = user?.role === 'super_admin' ? '/superadmin' : '/dashboard';
    return <Navigate to={redirectPath} replace />;
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
                      {publicRoutes.map((route: any, index: number) => (
                        <Route
                          key={`public-${index}`}
                          path={route.path}
                          element={<MainLayout>{route.element}</MainLayout>}
                        />
                      ))}
                      
                      {/* Auth routes - only accessible when not logged in */}
                      <Route element={<PublicOnlyRoute />}>
                        <Route path="/login" element={<MainLayout hideNav>{React.createElement(lazy(() => import('@/pages/Login')))}</MainLayout>} />
                        <Route path="/signup" element={<MainLayout hideNav>{React.createElement(lazy(() => import('@/pages/Signup')))}</MainLayout>} />
                      </Route>
                      
                      {/* Protected routes - require authentication */}
                      <Route element={<ProtectedRoute />}>
                        {protectedRoutes.map((route: any, index: number) => {
                          if (route.children) {
                            return (
                              <Route key={`protected-${index}`} path={route.path}>
                                {route.children.map((child: any, childIndex: number) => (
                                  <Route
                                    key={`child-${childIndex}`}
                                    {...child}
                                    element={<MainLayout>{child.element}</MainLayout>}
                                  />
                                ))}
                              </Route>
                            );
                          }
                          return (
                            <Route
                              key={`protected-${index}`}
                              path={route.path}
                              element={<MainLayout>{route.element}</MainLayout>}
                            />
                          );
                        })}
                        
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
                      
                      {/* Admin routes - require admin role */}
                      <Route element={<ProtectedRoute roles={['admin', 'super_admin']} />}>
                        {adminRoutes.map((route: any, index: number) => {
                          if (route.children) {
                            return (
                              <Route key={`admin-${index}`} path={route.path}>
                                {route.children.map((child: any, childIndex: number) => (
                                  <Route
                                    key={`admin-child-${childIndex}`}
                                    {...child}
                                    element={<MainLayout>{child.element}</MainLayout>}
                                  />
                                ))}
                              </Route>
                            );
                          }
                          return (
                            <Route
                              key={`admin-${index}`}
                              path={route.path}
                              element={<MainLayout>{route.element}</MainLayout>}
                            />
                          );
                        })}
                      </Route>
                      
                      {/* Superadmin routes - require super_admin role */}
                      <Route element={<ProtectedRoute roles={['super_admin']} />}>
                        {superadminRoutes.map((route: any, index: number) => {
                          if (route.children) {
                            return (
                              <Route key={`superadmin-${index}`} path={route.path}>
                                {route.children.map((child: any, childIndex: number) => (
                                  <Route
                                    key={`superadmin-child-${childIndex}`}
                                    {...child}
                                    element={<MainLayout>{child.element}</MainLayout>}
                                  />
                                ))}
                              </Route>
                            );
                          }
                          return (
                            <Route
                              key={`superadmin-${index}`}
                              path={route.path}
                              element={<MainLayout>{route.element}</MainLayout>}
                            />
                          );
                        })}
                      </Route>
                      
                      {/* 404 Not Found */}
                      <Route path="*" element={<MainLayout>{notFoundRoute.element}</MainLayout>} />
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
