import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/NewAuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { UserRole } from '@shared/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requiredPermissions?: string[];
}

export const ProtectedRoute = ({ 
  children, 
  requiredRoles = [],
  requiredPermissions = [] 
}: ProtectedRouteProps) => {
  const { user, isLoading, isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has required roles
  if (requiredRoles.length > 0 && !requiredRoles.some(role => user.roles?.includes(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check if user has required permissions
  if (requiredPermissions.length > 0 && 
      !requiredPermissions.every(permission => hasPermission(permission))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Admin route wrapper
export const AdminRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
    {children}
  </ProtectedRoute>
);

// Superadmin route wrapper
export const SuperadminRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN]}>
    {children}
  </ProtectedRoute>
);

// Permission-based route wrapper
export const PermissionRoute = ({ 
  children, 
  permission 
}: { 
  children: React.ReactNode; 
  permission: string 
}) => (
  <ProtectedRoute requiredPermissions={[permission]}>
    {children}
  </ProtectedRoute>
);
