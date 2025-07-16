import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export const ProtectedRoute = ({ 
  children, 
  requiredRoles = [] 
}: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // If still loading auth state, wait
      if (isLoading) return;

      // If not authenticated, redirect to login
      if (!isAuthenticated || !user) {
        navigate(`/login?callbackUrl=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }

      // Check if user has required roles
      if (requiredRoles.length > 0 && !requiredRoles.some(role => user.role?.includes(role))) {
        // User is authenticated but doesn't have required role
        navigate('/unauthorized');
        return;
      }

      // All checks passed
      setIsAuthorized(true);
      setIsChecking(false);
    };

    checkAuth();
  }, [isAuthenticated, isLoading, navigate, location, requiredRoles, user]);

  // Show loading state while checking auth
  if (isLoading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If not authorized, we've already handled the redirect
  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
};

// Admin route wrapper
export const AdminRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute requiredRoles={['admin']}>
    {children}
  </ProtectedRoute>
);

// Superadmin route wrapper
export const SuperadminRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute requiredRoles={['superadmin']}>
    {children}
  </ProtectedRoute>
);
