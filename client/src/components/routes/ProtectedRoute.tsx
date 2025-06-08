import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/JWTAuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export const ProtectedRoute = ({ 
  children, 
  requiredRoles = [] 
}: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required roles
  if (requiredRoles.length > 0 && !requiredRoles.some(role => user.roles?.includes(role))) {
    // User is authenticated but doesn't have required role
    return <Navigate to="/unauthorized" replace />;
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
