import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import useAuth from '@/contexts/auth/useAuth';
import { userService } from '@/services/api/userService';
import { UserRole } from '@/types/api';
// Super admin role types for type safety
const SUPER_ADMIN_ROLES: UserRole[] = [
    'superadmin',
    'superadmin_owner',
    'superadmin_staff',
    'superadmin_auditor',
    'super_admin'
] as const;

// Admin permission requirements
const ADMIN_PERMISSIONS = [
    'ACCESS_ANALYTICS',
    'BILLING_ACCESS',
    'MANAGE_TEAM_ROLES'
] as const;

export default function RoleBasedRedirect() {
    const { authReady, user } = useAuth();
    const [, setLocation] = useLocation();
    const [permissionsChecked, setPermissionsChecked] = useState(false);

    const checkUserPermissions = useCallback(async () => {
        if (!user) return false;

        try {
            // Get the user's actual role from the database
            const userData = await userService.getUserById(user.id);
            
            // Check for super admin role
            if (userData.role && SUPER_ADMIN_ROLES.includes(userData.role as UserRole)) {
                setLocation('/superadmin');
                return true;
            }

            // Check for admin permissions
            const { permissions = [] } = await userService.getPermissions();
            const hasAdminPermissions = ADMIN_PERMISSIONS.every(permission => 
                permissions.includes(permission)
            );

            if (hasAdminPermissions) {
                setLocation('/admin');
                return true;
            }
        } catch (error) {
            console.error('Error checking user permissions:', error);
        }

        return false;
    }, [user, setLocation]);

    useEffect(() => {
        // Only redirect if authentication is ready, user is logged in, and we haven't checked permissions yet
        if (!authReady || !user || permissionsChecked) return;

        const handleRedirect = async () => {
            const hasSpecialAccess = await checkUserPermissions();
            
            if (!hasSpecialAccess) {
                // Default to dashboard for regular users
                setLocation('/dashboard');
            }
            
            setPermissionsChecked(true);
        };

        handleRedirect();
    }, [authReady, user, permissionsChecked, checkUserPermissions]);

    return null; // This component doesn't render anything
}
