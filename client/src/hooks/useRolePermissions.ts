import React from 'react';
import { useQuery } from '@tanstack/react-query';

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
export function useRolePermissions() {
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['/api/user/permissions'],
    select: (data: any) => data?.permissions || []
  });

  const rolePermissions: RolePermissions = {
    // Trip Management
    canViewAllTrips: permissions.includes('VIEW_TEAM_ACTIVITY') || permissions.includes('MANAGE_ORGANIZATION'),
    canEditTeamTrips: permissions.includes('MANAGE_TEAM_ROLES') || permissions.includes('MANAGE_ORGANIZATION'),
    canCreateTrips: permissions.includes('CREATE_TRIPS'),
    canDeleteTrips: permissions.includes('ADMIN_ACCESS') || permissions.includes('MANAGE_ORGANIZATION'),
    
    // Team Management
    canManageTeam: permissions.includes('MANAGE_TEAM_ROLES') || permissions.includes('MANAGE_ORGANIZATION'),
    canInviteMembers: permissions.includes('INVITE_MEMBERS') || permissions.includes('MANAGE_TEAM_ROLES'),
    
    // Financial Access
    canAccessBilling: permissions.includes('BILLING_ACCESS') || permissions.includes('MANAGE_ORGANIZATION'),
    canIssueCards: permissions.includes('BILLING_ACCESS') || permissions.includes('ADMIN_ACCESS'),
    canFreezeCards: permissions.includes('BILLING_ACCESS') || permissions.includes('MANAGE_ORGANIZATION'),
    canViewTransactions: permissions.includes('BILLING_ACCESS') || permissions.includes('VIEW_TEAM_ACTIVITY'),
    canApproveExpenses: permissions.includes('MANAGE_TEAM_ROLES') || permissions.includes('ADMIN_ACCESS'),
    
    // Analytics & Reporting
    canAccessAnalytics: permissions.includes('ACCESS_ANALYTICS') || permissions.includes('view_analytics'),
    canExportData: permissions.includes('ACCESS_ANALYTICS') || permissions.includes('ADMIN_ACCESS'),
    
    // Organization Management
    canManageOrganization: permissions.includes('MANAGE_ORGANIZATION') || permissions.includes('manage_organizations'),
    canAccessWhiteLabel: permissions.includes('WHITE_LABEL_SETTINGS') || permissions.includes('ADMIN_ACCESS'),
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