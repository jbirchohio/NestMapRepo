import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from '@/contexts/auth/AuthContext';
import { userService } from '@/services/api/userService';

export default function RoleBasedRedirect() {
  const { roleType, authReady, user } = useAuth();
  const [, setLocation] = useLocation();
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  useEffect(() => {
    // Only redirect if authentication is ready and user is logged in
    if (!authReady || !user || permissionsChecked) return;

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
            setLocation('/superadmin');
            setPermissionsChecked(true);
            return;
          }
          
          // Check for organization-level admin permissions (but not system superadmin)
          const { permissions = [] } = await userService.getPermissions();
          
          if (permissions.includes('ACCESS_ANALYTICS') &&
              permissions.includes('BILLING_ACCESS') &&
              permissions.includes('MANAGE_TEAM_ROLES')) {
            setLocation('/admin');
            setPermissionsChecked(true);
            return;
          }
        } catch (error) {
          console.error('Error checking user permissions:', error);
        }
      } catch (err) {
        // Could not check permissions, proceeding with role-based redirect
      }

      // Map role types to unified dashboard route
      setLocation('/dashboard');
      setPermissionsChecked(true);
    };

    checkPermissions();
  }, [authReady, user, roleType, setLocation, permissionsChecked]);

  return null; // This component doesn't render anything
}
