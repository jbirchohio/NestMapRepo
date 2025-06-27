import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/state/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { UserRole } from '@shared/types/auth/UserRole';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requiredPermissions?: string[];
}

/**
 * A component that renders children only if the user is authenticated and has the required roles/permissions.
 * Otherwise, it redirects to the login page or an unauthorized page.
 */
export const ProtectedRoute = ({ 
  children, 
  requiredRoles = [],
  requiredPermissions = [] 
}: ProtectedRouteProps) => {
  const { user, isLoading, isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();

  // Show loading state while auth state is being determined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If user is not authenticated, redirect to login with the current location
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check if user has the required role
  const hasRequiredRole = requiredRoles.length === 0 || requiredRoles.includes(user.role);
  if (!hasRequiredRole) {
    console.warn(`User does not have required role. Required: ${requiredRoles.join(', ')}. Has: ${user.role}`);
    return <Navigate to="/unauthorized" state={{ from: location.pathname }} replace />;
  }

  // Check if user has all required permissions
  const hasAllPermissions = requiredPermissions.length === 0 || 
    requiredPermissions.every(permission => hasPermission(permission));
  
  if (!hasAllPermissions) {
    console.warn(`User does not have required permissions: ${requiredPermissions.join(', ')}`);
    return <Navigate to="/unauthorized" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

interface RouteWrapperProps {
  children: React.ReactNode;
}

interface PermissionRouteProps extends RouteWrapperProps {
  permission: string;
}

/**
 * Route wrapper that only allows admin users
 */
export const AdminRoute = ({ children }: RouteWrapperProps) => (
  <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
    {children}
  </ProtectedRoute>
);

/**
 * Route wrapper that only allows superadmin users
 */
export const SuperadminRoute = ({ children }: RouteWrapperProps) => (
  <ProtectedRoute requiredRoles={[UserRole.SUPER_ADMIN]}>
    {children}
  </ProtectedRoute>
);

/**
 * Route wrapper that checks for specific permissions
 */
export const PermissionRoute = ({ 
  children, 
  permission 
}: PermissionRouteProps) => (
  <ProtectedRoute requiredPermissions={[permission]}>
    {children}
  </ProtectedRoute>
);
