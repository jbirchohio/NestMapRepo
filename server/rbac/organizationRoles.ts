/**
 * Organization-Level RBAC System
 * Provides granular permissions within organizations for enhanced collaboration
 */

export type OrganizationRole = 'admin' | 'manager' | 'editor' | 'member' | 'viewer';

export interface OrganizationPermissions {
  // Trip Management
  createTrips: boolean;
  editAllTrips: boolean;
  editOwnTrips: boolean;
  deleteAllTrips: boolean;
  deleteOwnTrips: boolean;
  viewAllTrips: boolean;

  // Team Management
  inviteMembers: boolean;
  manageMembers: boolean;
  assignRoles: boolean;

  // Organization Settings
  editOrganization: boolean;
  viewBilling: boolean;
  manageBilling: boolean;

  // Analytics & Reports
  viewAnalytics: boolean;
  exportData: boolean;

  // White Label & Branding
  manageWhiteLabel: boolean;
  editBranding: boolean;

  // Advanced Features
  useAIFeatures: boolean;
  accessAPI: boolean;
  manageIntegrations: boolean;
}

/**
 * Organization role permission matrix
 */
export const ORGANIZATION_ROLE_PERMISSIONS: Record<OrganizationRole, OrganizationPermissions> = {
  admin: {
    // Full organization control
    createTrips: true,
    editAllTrips: true,
    editOwnTrips: true,
    deleteAllTrips: true,
    deleteOwnTrips: true,
    viewAllTrips: true,

    // Team management
    inviteMembers: true,
    manageMembers: true,
    assignRoles: true,

    // Organization settings
    editOrganization: true,
    viewBilling: true,
    manageBilling: true,

    // Analytics & reports
    viewAnalytics: true,
    exportData: true,

    // White label & branding
    manageWhiteLabel: true,
    editBranding: true,

    // Advanced features
    useAIFeatures: true,
    accessAPI: true,
    manageIntegrations: true,
  },

  manager: {
    // Trip management for team
    createTrips: true,
    editAllTrips: true,
    editOwnTrips: true,
    deleteAllTrips: false, // Cannot delete others' trips
    deleteOwnTrips: true,
    viewAllTrips: true,

    // Limited team management
    inviteMembers: true,
    manageMembers: false, // Cannot remove members
    assignRoles: false, // Cannot assign roles

    // Read-only organization settings
    editOrganization: false,
    viewBilling: true,
    manageBilling: false,

    // Analytics access
    viewAnalytics: true,
    exportData: true,

    // No white label access
    manageWhiteLabel: false,
    editBranding: false,

    // Standard features
    useAIFeatures: true,
    accessAPI: true,
    manageIntegrations: false,
  },

  editor: {
    // Trip editing capabilities
    createTrips: true,
    editAllTrips: false, // Can only edit assigned trips
    editOwnTrips: true,
    deleteAllTrips: false,
    deleteOwnTrips: true,
    viewAllTrips: true,

    // No team management
    inviteMembers: false,
    manageMembers: false,
    assignRoles: false,

    // No organization settings
    editOrganization: false,
    viewBilling: false,
    manageBilling: false,

    // Limited analytics
    viewAnalytics: true,
    exportData: false,

    // No white label access
    manageWhiteLabel: false,
    editBranding: false,

    // Standard features
    useAIFeatures: true,
    accessAPI: false,
    manageIntegrations: false,
  },

  member: {
    // Basic trip capabilities
    createTrips: true,
    editAllTrips: false,
    editOwnTrips: true,
    deleteAllTrips: false,
    deleteOwnTrips: true,
    viewAllTrips: false, // Can only see assigned trips

    // No team management
    inviteMembers: false,
    manageMembers: false,
    assignRoles: false,

    // No organization settings
    editOrganization: false,
    viewBilling: false,
    manageBilling: false,

    // No analytics
    viewAnalytics: false,
    exportData: false,

    // No white label access
    manageWhiteLabel: false,
    editBranding: false,

    // Basic features
    useAIFeatures: true,
    accessAPI: false,
    manageIntegrations: false,
  },

  viewer: {
    // Read-only access
    createTrips: false,
    editAllTrips: false,
    editOwnTrips: false,
    deleteAllTrips: false,
    deleteOwnTrips: false,
    viewAllTrips: false, // Can only see assigned trips

    // No team management
    inviteMembers: false,
    manageMembers: false,
    assignRoles: false,

    // No organization settings
    editOrganization: false,
    viewBilling: false,
    manageBilling: false,

    // No analytics
    viewAnalytics: false,
    exportData: false,

    // No white label access
    manageWhiteLabel: false,
    editBranding: false,

    // No advanced features
    useAIFeatures: false,
    accessAPI: false,
    manageIntegrations: false,
  },
};

/**
 * Check if a user has a specific permission within their organization
 */
export function hasOrganizationPermission(
  userRole: OrganizationRole,
  permission: keyof OrganizationPermissions,
  customPermissions?: Partial<OrganizationPermissions>
): boolean {
  // Check custom permissions first (overrides)
  if (customPermissions && customPermissions[permission] !== undefined) {
    return customPermissions[permission]!;
  }

  // Check role-based permissions
  return ORGANIZATION_ROLE_PERMISSIONS[userRole][permission];
}

/**
 * Get all permissions for a user's organization role
 */
export function getOrganizationPermissions(
  userRole: OrganizationRole,
  customPermissions?: Partial<OrganizationPermissions>
): OrganizationPermissions {
  const rolePermissions = ORGANIZATION_ROLE_PERMISSIONS[userRole];

  // Merge with custom permissions if provided
  if (customPermissions) {
    return { ...rolePermissions, ...customPermissions };
  }

  return rolePermissions;
}

/**
 * Check if a user can perform an action on a specific trip
 */
export function canAccessTrip(
  userRole: OrganizationRole,
  isOwnTrip: boolean,
  isCollaborator: boolean,
  action: 'view' | 'edit' | 'delete',
  customPermissions?: Partial<OrganizationPermissions>
): boolean {
  const permissions = getOrganizationPermissions(userRole, customPermissions);

  switch (action) {
    case 'view':
      return permissions.viewAllTrips || isOwnTrip || isCollaborator;

    case 'edit':
      if (isOwnTrip && permissions.editOwnTrips) return true;
      if (permissions.editAllTrips) return true;
      return isCollaborator; // Trip collaborators can edit

    case 'delete':
      if (isOwnTrip && permissions.deleteOwnTrips) return true;
      return permissions.deleteAllTrips;

    default:
      return false;
  }
}

/**
 * Get user-friendly role description
 */
export function getRoleDescription(role: OrganizationRole): string {
  switch (role) {
    case 'admin':
      return 'Full organization control and management';
    case 'manager':
      return 'Team oversight and trip management';
    case 'editor':
      return 'Create and edit trips with collaboration';
    case 'member':
      return 'Create and manage own trips';
    case 'viewer':
      return 'View-only access to assigned trips';
    default:
      return 'Unknown role';
  }
}

/**
 * Validate role hierarchy for role assignment
 */
export function canAssignRole(assignerRole: OrganizationRole, targetRole: OrganizationRole): boolean {
  const roleHierarchy: Record<OrganizationRole, number> = {
    admin: 5,
    manager: 4,
    editor: 3,
    member: 2,
    viewer: 1,
  };

  // Can only assign roles equal to or lower than your own
  return roleHierarchy[assignerRole] >= roleHierarchy[targetRole];
}