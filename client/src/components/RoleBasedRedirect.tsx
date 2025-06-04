import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function RoleBasedRedirect() {
  const { roleType, authReady, user } = useAuth();
  const [, setLocation] = useLocation();
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  useEffect(() => {
    // Only redirect if authentication is ready and user is logged in
    if (!authReady || !user || permissionsChecked) return;

    // Check for superadmin and admin permissions
    const checkPermissions = async () => {
      try {
        const permissionsResponse = await fetch('/api/user/permissions');
        if (permissionsResponse.ok) {
          const data = await permissionsResponse.json();
          const permissions = data.permissions || [];
          
          // If user has superadmin permissions, redirect to superadmin dashboard
          if (permissions.includes('manage_organizations') || 
              permissions.includes('manage_users') || 
              permissions.includes('MANAGE_ORGANIZATION') ||
              permissions.includes('ADMIN_ACCESS')) {
            setLocation('/superadmin');
            setPermissionsChecked(true);
            return;
          }
          
          // Check for admin-level permissions (but not superadmin)
          if (permissions.includes('ACCESS_ANALYTICS') &&
              permissions.includes('BILLING_ACCESS') &&
              permissions.includes('MANAGE_TEAM_ROLES')) {
            setLocation('/admin');
            setPermissionsChecked(true);
            return;
          }
        }
      } catch (err) {
        console.log('Could not check permissions, proceeding with role-based redirect');
      }

      // Map role types to dashboard routes for regular users
      if (roleType === 'agency') {
        setLocation('/dashboard/agency');
      } else if (roleType === 'corporate') {
        setLocation('/dashboard/corporate');
      } else {
        // Default to corporate dashboard if role type is not set
        setLocation('/dashboard/corporate');
      }
      setPermissionsChecked(true);
    };

    checkPermissions();
  }, [authReady, user, roleType, setLocation, permissionsChecked]);

  return null; // This component doesn't render anything
}