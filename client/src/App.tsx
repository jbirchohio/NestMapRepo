import { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from "@/contexts/auth/NewAuthContext";
import ErrorBoundary from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RouteRenderer } from '@/components/routes/RouteRenderer';
import { publicRoutes, protectedRoutes, adminRoutes, superadminRoutes } from '@/config/routes.new';

// Create a client with auth-aware defaults
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

// Main App Router Component
const AppRouter = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Handle route changes
  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
    
    // Preload the next route
    const pathname = location.pathname;
    import('@/config/routes.new')
      .then(({ preloadRoute }) => preloadRoute(pathname))
      .catch(console.error);
  }, [location.pathname]);

  // Show loading state while auth is being checked
  if (isLoading) {
    return <PageLoading />;
  }

  // Redirect to login if not authenticated and trying to access protected route
  if (!isAuthenticated && !['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname)) {
    // Use setTimeout to avoid React rendering issues
    setTimeout(() => navigate('/login', { state: { from: location }, replace: true }), 0);
    return <PageLoading />;
  }

  // If authenticated and trying to access auth pages, redirect to dashboard
  if (isAuthenticated && ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname)) {
    setTimeout(() => navigate('/dashboard', { replace: true }), 0);
    return <PageLoading />;
  }

  return (
    <>
      <RouteRenderer routes={[...publicRoutes, ...protectedRoutes, ...adminRoutes, ...superadminRoutes]} />
      <Toaster />
    </>
  );
};

// Create a wrapper component that provides auth context to the app
function AuthApp() {
  return (
    <AuthProvider>
      <Router>
        <AppRouter />
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </AuthProvider>
  );
}

// Main App Component
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <AuthApp />
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
