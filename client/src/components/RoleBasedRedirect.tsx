import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/api/userService';

interface RoleBasedRedirectProps {
  children?: React.ReactNode;
}

export default function RoleBasedRedirect({ children }: RoleBasedRedirectProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  useEffect(() => {
    // Only redirect if authentication is ready and user is logged in
    if (isLoading || !isAuthenticated || !user || permissionsChecked) return;

    // Check user's actual role from database, not organization permissions
    const checkPermissions = async () => {
      try {
        // Get the user's actual role from the database
        try {
          const userData = await userService.getUserById(user.id);
          
          // Only redirect to superadmin if user has actual superadmin role
          if (userData.role === 'superadmin' || 
              userData.role === 'superadmin_owner' || 
              userData.role === 'superadmin_staff' || 
              userData.role === 'superadmin_auditor' || 
              userData.role === 'super_admin') {
            await router.push('/superadmin');
            setPermissionsChecked(true);
            return;
          }
          
          // Check for organization-level admin permissions (but not system superadmin)
          const { permissions = [] } = await userService.getPermissions();
          
          if (permissions.includes('ACCESS_ANALYTICS') &&
              permissions.includes('BILLING_ACCESS') &&
              permissions.includes('MANAGE_TEAM_ROLES')) {
            await router.push('/admin');
            setPermissionsChecked(true);
            return;
          }
        } catch (error) {
          console.error('Error checking user permissions:', error);
        }
      } catch (err) {
        console.error('Error in permission check:', err);
      }

      // Map role types to unified dashboard route
      router.push('/dashboard');
      setPermissionsChecked(true);
    };

    checkPermissions();
  }, [isAuthenticated, isLoading, user, router, permissionsChecked]);

  // If we have children, render them, otherwise return null
  return children || null; // This component doesn't render anything
}
