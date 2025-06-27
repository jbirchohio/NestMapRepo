/**
 * User roles and permissions definitions
 * This serves as the single source of truth for authorization in the application
 */

/**
 * System roles with hierarchical permissions
 * 
 * - super_admin: Full system access across all organizations
 * - admin: Administrative access within an organization
 * - manager: Management access for teams and resources
 * - member: Standard user with basic access
 * - guest: Limited read-only access
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',   // Full system access across all organizations
  ADMIN = 'admin',              // Organization administrator
  MANAGER = 'manager',          // Team manager
  MEMBER = 'member',            // Regular organization member
  GUEST = 'guest'              // Read-only access
}

export type UserRoleType = UserRole;

/**
 * Permission scopes define the domain of the permission
 */
export type PermissionScope = 
  | 'organization'   // Organization management
  | 'user'           // User management
  | 'billing'        // Billing and subscription
  | 'settings'       // System settings
  | 'data'           // Data access
  | 'content'        // Content management
  | 'api'            // API access
  | 'audit';         // Audit logs

/**
 * Permission actions define what can be done with a resource
 */
export type PermissionAction =
  | 'create'         // Create new resources
  | 'read'           // View resources
  | 'update'         // Modify existing resources
  | 'delete'         // Remove resources
  | 'manage'         // Full control over resources
  | 'approve'        // Approve/review actions
  | 'export'         // Export data
  | 'import';        // Import data

// Remove the duplicate PermissionAction type later in the file

/**
 * Resource types that permissions can be applied to
 */
export type ResourceType =
  | 'user'           // User accounts
  | 'role'           // User roles
  | 'organization'   // Organizations
  | 'team'           // Teams within organizations
  | 'document'       // Documents and files
  | 'api_key'        // API access keys
  | 'audit_log'      // System audit logs
  | 'billing'        // Billing information
  | 'subscription';  // Subscription plans

/**
 * Permission level defines the scope of the permission
 */
export type PermissionLevel =
  | 'own'            // Only own resources
  | 'team'           // Resources owned by the user's team
  | 'organization'   // All resources in the organization
  | 'all';           // All resources in the system

/**
 * Permission effect determines if the permission is allowed or denied
 */
export type PermissionEffect = 'allow' | 'deny';

/**
 * Permission condition for fine-grained access control
 */
export interface PermissionCondition {
  // Field to check (e.g., 'status', 'ownerId')
  field: string;
  // Operator for comparison (e.g., 'equals', 'notEquals', 'in', 'notIn')
  operator: 'equals' | 'notEquals' | 'in' | 'notIn' | 'contains' | 'startsWith' | 'endsWith';
  // Value to compare against
  value: any /** FIXANYERROR: Replace 'any' */;
}

/**
 * Permission definition
 */
export interface PermissionDefinition {
  // Unique permission key (e.g., 'user:create:own')
  key: string;
  // Human-readable name
  name: string;
  // Description of what this permission allows
  description: string;
  // Default roles that have this permission
  defaultRoles: UserRole[];
  // Resource type this permission applies to
  resource: ResourceType;
  // Action this permission allows
  action: PermissionAction;
  // Scope of the permission
  scope: PermissionScope;
  // Permission level (own, team, organization, all)
  level: PermissionLevel;
  // Whether this permission is a system permission (not modifiable)
  isSystem?: boolean;
  // Optional conditions for the permission
  conditions?: PermissionCondition[];
}
// PermissionAction type is already defined above

/**
 * Permission definition
 */
export interface Permission {
  /** Unique permission key */
  key: string;
  /** Human-readable name */
  name: string;
  /** Description of what this permission allows */
  description: string;
  /** Default roles that have this permission */
  defaultRoles: UserRole[];
  /** Scope of the permission */
  scope: PermissionScope;
  /** Action this permission allows */
  action: PermissionAction;
  /** Resource this permission applies to */
  resource: string;
}

/**
 * System permissions
 * These define all possible permissions in the system
 */
export const PERMISSIONS: Record<string, Permission> = {
  // Organization permissions
  ORGANIZATION_READ: {
    key: 'organization:read',
    name: 'View Organization',
    description: 'View organization details and settings',
    defaultRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER, UserRole.GUEST],
    scope: 'organization',
    action: 'read',
    resource: 'organization',
  },
  ORGANIZATION_UPDATE: {
    key: 'organization:update',
    name: 'Update Organization',
    description: 'Update organization details and settings',
    defaultRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
    scope: 'organization',
    action: 'update',
    resource: 'organization',
  },
  ORGANIZATION_DELETE: {
    key: 'organization:delete',
    name: 'Delete Organization',
    description: 'Delete the organization',
    defaultRoles: [UserRole.SUPER_ADMIN],
    scope: 'organization',
    action: 'delete',
    resource: 'organization',
  },
  
  // User management permissions
  USER_CREATE: {
    key: 'user:create',
    name: 'Create Users',
    description: 'Create new users in the organization',
    defaultRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER],
    scope: 'user',
    action: 'create',
    resource: 'user',
  },
  USER_READ: {
    key: 'user:read',
    name: 'View Users',
    description: 'View user profiles in the organization',
    defaultRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER],
    scope: 'user',
    action: 'read',
    resource: 'user',
  },
  USER_UPDATE: {
    key: 'user:update',
    name: 'Update Users',
    description: 'Update user profiles in the organization',
    defaultRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER],
    scope: 'user',
    action: 'update',
    resource: 'user',
  },
  USER_DELETE: {
    key: 'user:delete',
    name: 'Delete Users',
    description: 'Delete users from the organization',
    defaultRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
    scope: 'user',
    action: 'delete',
    resource: 'user',
  },
  
  // Billing permissions
  BILLING_READ: {
    key: 'billing:read',
    name: 'View Billing',
    description: 'View billing information and invoices',
    defaultRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
    scope: 'billing',
    action: 'read',
    resource: 'billing',
  },
  BILLING_UPDATE: {
    key: 'billing:update',
    name: 'Update Billing',
    description: 'Update billing information and payment methods',
    defaultRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
    scope: 'billing',
    action: 'update',
    resource: 'billing',
  },
  
  // Settings permissions
  SETTINGS_READ: {
    key: 'settings:read',
    name: 'View Settings',
    description: 'View system settings',
    defaultRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER],
    scope: 'settings',
    action: 'read',
    resource: 'settings',
  },
  SETTINGS_UPDATE: {
    key: 'settings:update',
    name: 'Update Settings',
    description: 'Update system settings',
    defaultRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
    scope: 'settings',
    action: 'update',
    resource: 'settings',
  },
} as const;

/**
 * Type of permission keys for type safety
 */
export type PermissionKey = keyof typeof PERMISSIONS;

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): string[] {
  return Object.values(PERMISSIONS)
    .filter(permission => permission.defaultRoles.includes(role))
    .map(permission => permission.key);
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permissionKey: string): boolean {
  const permission = Object.values(PERMISSIONS).find(p => p.key === permissionKey);
  if (!permission) return false;
  return permission.defaultRoles.includes(role);
}

/**
 * Get all permissions grouped by scope
 */
export function getPermissionsByScope() {
  return Object.values(PERMISSIONS).reduce<Record<PermissionScope, Permission[]>>(
    (acc, permission) => {
      if (!acc[permission.scope]) {
        acc[permission.scope] = [];
      }
      acc[permission.scope].push(permission);
      return acc;
    },
    {} as Record<PermissionScope, Permission[]>
  );
}
