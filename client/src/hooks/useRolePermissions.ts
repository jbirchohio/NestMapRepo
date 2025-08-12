import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface RolePermissions {
  canViewAllTrips: boolean;
  canEditTeamTrips: boolean;
  canManageTeam: boolean;
  canAccessBilling: boolean;
  canInviteMembers: boolean;
  canAccessAnalytics: boolean;
  canManageOrganization: boolean;
  canAccessWhiteLabel: boolean;
  canIssueCards: boolean;
  canFreezeCards: boolean;
  canViewTransactions: boolean;
  canApproveExpenses: boolean;
  canCreateTrips: boolean;
  canDeleteTrips: boolean;
  canExportData: boolean;
}

/**
 * Hook to check user permissions based on role
 * Provides granular permission checking for UI components
 */
// Define the API response type
interface PermissionsResponse {
  permissions?: {
    canViewTrips?: boolean;
    canCreateTrips?: boolean;
    canEditTrips?: boolean;
    canDeleteTrips?: boolean;
    canViewAnalytics?: boolean;
    canManageOrganization?: boolean;
    canAccessAdmin?: boolean;
  };
}

export function useRolePermissions() {
  const { data: permissionsData, isLoading } = useQuery<PermissionsResponse>({
    queryKey: ['/api/user/permissions'],
    queryFn: () => apiRequest('GET', '/api/user/permissions'),
  });

  // Handle both object and array permission formats
  const permissions = (permissionsData as PermissionsResponse)?.permissions || {
    canViewTrips: true,
    canCreateTrips: true,
    canEditTrips: true,
    canDeleteTrips: true,
    canViewAnalytics: true,
    canManageOrganization: true,
    canAccessAdmin: true
  };

  const rolePermissions: RolePermissions = {
    // Trip Management - use object properties directly
    canViewAllTrips: permissions.canViewTrips || permissions.canViewAnalytics || false,
    canEditTeamTrips: permissions.canEditTrips || false,
    canCreateTrips: permissions.canCreateTrips || false,
    canDeleteTrips: permissions.canDeleteTrips || false,

    // Team Management
    canManageTeam: permissions.canManageOrganization || false,
    canInviteMembers: permissions.canManageOrganization || false,

    // Financial Access
    canAccessBilling: permissions.canAccessAdmin || false,
    canIssueCards: permissions.canAccessAdmin || false,
    canFreezeCards: permissions.canAccessAdmin || false,
    canViewTransactions: permissions.canViewAnalytics || false,
    canApproveExpenses: permissions.canAccessAdmin || false,

    // Analytics & Reporting
    canAccessAnalytics: permissions.canViewAnalytics || false,
    canExportData: permissions.canAccessAdmin || false,

    // Organization Management
    canManageOrganization: permissions.canManageOrganization || false,
    canAccessWhiteLabel: permissions.canAccessAdmin || false,
  };

  return {
    permissions: rolePermissions,
    isLoading,
    hasPermission: (permission: keyof RolePermissions) => rolePermissions[permission],
    hasAnyPermission: (permissionList: (keyof RolePermissions)[]) =>
      permissionList.some(permission => rolePermissions[permission])
  };
}

/**
 * Role-based component wrapper
 * Only renders children if user has required permissions
 */
interface RoleGateProps {
  children: React.ReactNode;
  requiredPermissions?: (keyof RolePermissions)[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
  fallback?: React.ReactNode;
}

export function RoleGate({
  children,
  requiredPermissions = [],
  requireAll = false,
  fallback = null
}: RoleGateProps) {
  const { permissions, isLoading } = useRolePermissions();

  if (isLoading) {
    return React.createElement('div', {
      className: 'animate-pulse bg-gray-200 dark:bg-gray-700 h-8 rounded'
    });
  }

  if (requiredPermissions.length === 0) {
    return React.createElement(React.Fragment, null, children);
  }

  const hasAccess = requireAll
    ? requiredPermissions.every(permission => permissions[permission])
    : requiredPermissions.some(permission => permissions[permission]);

  return hasAccess
    ? React.createElement(React.Fragment, null, children)
    : React.createElement(React.Fragment, null, fallback);
}