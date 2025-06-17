import { Suspense, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  useLocation
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/contexts/auth/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MainLayout } from '@/layouts';
import { 
  ProtectedRoute, 
  AdminRoute, 
  SuperadminRoute, 
  RouteRenderer 
} from '@/components/routes';
import { useRoutePreloading } from '@/utils/routeUtils';

// Routes
import { 
  publicRoutes, 
  protectedRoutes, 
  adminRoutes, 
  superadminRoutes, 
  notFoundRoute 
} from '@/config/routes';


// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading component for Suspense fallback
const PageLoading = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <LoadingSpinner size="lg" />
  </div>
);

// Main App Router
const PublicRoutes = () => (
  <MainLayout hideNav hideFooter>
    <Routes>
      {publicRoutes.map((route) => (
        <Route
          key={route.path as string}
          path={route.path}
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoading />}>{route.element}</Suspense>
            </ErrorBoundary>
          }
        />
      ))}
    </Routes>
  </MainLayout>
);

const ProtectedRoutes = () => (
  <ProtectedRoute>
    <MainLayout>
      <RouteRenderer routes={protectedRoutes} />
    </MainLayout>
  </ProtectedRoute>
);

const AdminRoutes = () => (
  <AdminRoute>
    <MainLayout>
      <RouteRenderer routes={adminRoutes} />
    </MainLayout>
  </AdminRoute>
);

const SuperadminRoutes = () => (
  <SuperadminRoute>
    <MainLayout>
      <RouteRenderer routes={superadminRoutes} />
    </MainLayout>
  </SuperadminRoute>
);

const NotFound = () => (
  <MainLayout hideNav={false} hideFooter={false}>
    <ErrorBoundary>
      <Suspense fallback={<PageLoading />}>{notFoundRoute.element}</Suspense>
    </ErrorBoundary>
  </MainLayout>
);

const AppRouter = () => {
  useRoutePreloading();
  const { isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <Routes>
      <Route path="/*" element={<PublicRoutes />} />
      <Route path="/app/*" element={<ProtectedRoutes />} />
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="/superadmin/*" element={<SuperadminRoutes />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Main App Component
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router>
            <AppRouter />
            <Toaster />
          </Router>
        </TooltipProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
