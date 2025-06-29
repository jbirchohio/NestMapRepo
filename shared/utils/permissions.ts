// Define UserRole type based on the auth types
export type UserRole = 'user' | 'admin' | 'moderator' | 'superadmin';

// Helper function to create a role hierarchy
const createRoleHierarchy = (): Map<UserRole, UserRole[]> => {
  const hierarchy = new Map<UserRole, UserRole[]>();
  
  // Define roles with their inherited roles
  const roles: Record<UserRole, UserRole[]> = {
    superadmin: ['admin', 'moderator', 'user'],
    admin: ['moderator', 'user'],
    moderator: ['user'],
    user: []
  };
  
  // Initialize the map with type safety
  (Object.entries(roles) as [UserRole, UserRole[]][]).forEach(([role, inheritedRoles]) => {
    hierarchy.set(role, inheritedRoles);
  });
  
  return hierarchy;
};

// Permission level types
type PermissionLevel = 'none' | 'read' | 'write' | 'admin' | 'manage' | 'own' | 'organization' | 'user';

// Permission action types
type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage';

// Resource type (can be expanded based on your needs)
type ResourceType = string;

// Permission scope types
type PermissionScope = 'own' | 'team' | 'organization' | 'global' | 'user';

// Permission condition type
type PermissionCondition = {
  (context: Record<string, unknown>): boolean;
  field?: string;
  operator?: string;
  value?: unknown;
};

// Permission definition interface
interface PermissionDefinition {
  id: string;
  name: string;
  description?: string;
  resource: ResourceType;
  action: PermissionAction;
  level: PermissionLevel | 'organization' | 'user';
  scope?: PermissionScope;
  condition?: PermissionCondition;
  conditions?: PermissionCondition[];
  allowedRoles?: string[];
  allowedPermissions?: string[];
  defaultRoles?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown; // Allow additional properties
}

// Permission level values with numeric weights
type PermissionLevelValue = 'read' | 'write' | 'admin' | 'manage';
const PermissionLevelValues: Record<PermissionLevelValue, number> = {
  read: 1,
  write: 2,
  admin: 3,
  manage: 4
} as const;

/**
 * Permission Manager class for handling role-based access control
 */
export class PermissionManager {
  private permissions: Map<string, PermissionDefinition> = new Map();
  private roleHierarchy: Map<UserRole, UserRole[]> = createRoleHierarchy();

  constructor(permissions: PermissionDefinition[] = []) {
    this.initializeRoleHierarchy();
    this.registerPermissions(permissions);
  }

  /**
   * Initialize the role hierarchy
   */
  private initializeRoleHierarchy(): void {
    // Role hierarchy is already set up by createRoleHierarchy
  }

  /**
   * Register multiple permissions
   */
  public registerPermissions(permissions: PermissionDefinition[]): void {
    for (const permission of permissions) {
      this.registerPermission(permission);
    }
  }

  /**
   * Register a single permission
   */
  public registerPermission(permission: PermissionDefinition): void {
    this.permissions.set(permission.id, permission);
  }

  /**
   * Check if a user with the given role has the specified permission
   */
  public hasPermission(
    role: UserRole,
    resource: ResourceType,
    action: PermissionAction,
    level: PermissionLevel = 'own',
    context: Record<string, unknown> = {}
  ): boolean {
    // Super admin has all permissions
    if (role === 'superadmin') return true;

    // Check direct permissions first
    const permissions = this.getPermissionsForRole(role);
    
    // Find matching permissions
    const matchingPermissions = permissions.filter(p => 
      p.resource === resource && 
      p.action === action &&
      this.matchesLevel(p.level, level)
    );

    // Check if any permission is explicitly denied
    const denied = matchingPermissions.some(p => 
      p.conditions?.some(c => this.evaluateCondition(c, context) === false)
    );
    if (denied) return false;

    // Check if any permission is explicitly allowed
    const allowed = matchingPermissions.some(p => 
      !p.conditions || p.conditions.every(c => this.evaluateCondition(c, context))
    );

    return allowed;
  }

  /**
   * Get all permissions for a role, including inherited permissions
   */
  public getPermissionsForRole(role: UserRole): PermissionDefinition[] {
    const permissions: PermissionDefinition[] = [];
    
    // Get all roles including inherited ones
    const rolesToCheck = this.getInheritedRoles(role);
    const validRoles: UserRole[] = ['user', 'admin', 'moderator', 'superadmin'];
    
    // Find all permissions that include any of the roles in allowedRoles or defaultRoles
    for (const permission of this.permissions.values()) {
      // Safely filter and type guard the roles
      const filterValidRoles = (roles: (string | UserRole)[] | undefined): UserRole[] => 
        roles?.filter((r): r is UserRole => 
          typeof r === 'string' && validRoles.includes(r as UserRole)
        ) || [];
      
      const allowedRoles = filterValidRoles(permission.allowedRoles);
      const defaultRoles = filterValidRoles(permission.defaultRoles);
      
      // Check if any of the user's roles match the permission's roles
      const hasMatchingRole = [...allowedRoles, ...defaultRoles].some(
        r => rolesToCheck.includes(r)
      );
      
      if (hasMatchingRole) {
        permissions.push(permission);
      }
    }
    
    return permissions;
  }

  /**
   * Get all roles that are lower in the hierarchy than the given role
   */
  public getInferiorRoles(role: UserRole): UserRole[] {
    // Ensure the role exists in the hierarchy
    if (!this.roleHierarchy.has(role)) {
      console.warn(`Role '${role}' not found in hierarchy`);
      return [];
    }
    return this.roleHierarchy.get(role) || [];
  }

  /**
   * Get all roles that inherit from the given role
   */
  private getInheritedRoles(role: UserRole): UserRole[] {
    const roles = new Set<UserRole>([role]);
    const addInherited = (r: UserRole) => {
      const inherited = this.roleHierarchy.get(r) || [];
      for (const ir of inherited) {
        if (!roles.has(ir)) {
          roles.add(ir);
          addInherited(ir);
        }
      }
    };
    addInherited(role);
    return Array.from(roles);
  }

  /**
   * Check if permission level matches the required level
   */
  private matchesLevel(
    requiredLevel: PermissionLevel,
    userLevel: PermissionLevel
  ): boolean {
    // Convert aliases to standard permission levels
    const resolveLevel = (level: PermissionLevel): PermissionLevelValue => {
      switch (level) {
        case 'organization':
        case 'write':
          return 'write';
        case 'user':
        case 'own':
        case 'read':
          return 'read';
        case 'admin':
          return 'admin';
        case 'manage':
          return 'manage';
        default:
          return 'read'; // Default to read access
      }
    };

    const resolvedUserLevel = resolveLevel(userLevel);
    const resolvedRequiredLevel = resolveLevel(requiredLevel);
    
    return (PermissionLevelValues[resolvedUserLevel] || 0) >= 
           (PermissionLevelValues[resolvedRequiredLevel] || 0);
  }

  /**
   * Get a value from context using dot notation
   */
  private getValueFromContext(field: string, context: Record<string, any>): any {
    return field.split('.').reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined), context);
  }

  /**
   * Compare values based on operator
   */
  private compareValues(fieldValue: any, operator: string, value: any): boolean {
    if (operator === 'equals') return fieldValue === value;
    if (operator === 'notEquals') return fieldValue !== value;
    if (operator === 'in') return Array.isArray(value) && value.includes(fieldValue);
    if (operator === 'notIn') return Array.isArray(value) && !value.includes(fieldValue);
    if (operator === 'contains') return typeof fieldValue === 'string' && fieldValue.includes(value);
    if (operator === 'startsWith') return typeof fieldValue === 'string' && fieldValue.startsWith(value);
    if (operator === 'endsWith') return typeof fieldValue === 'string' && fieldValue.endsWith(value);
    return false;
  }

  /**
   * Evaluate a permission condition against the current context
   */
  private evaluateCondition(condition: PermissionCondition, context: Record<string, any>): boolean {
    try {
      const { field, operator, value } = condition;
      
      // If field is not provided, we can't evaluate the condition
      if (!field) {
        return false;
      }
      
      const fieldValue = this.getNestedField(context, field);
      
      // Handle different operators safely
      switch (operator) {
        case 'equals':
          return fieldValue === value;
        case 'notEquals':
          return fieldValue !== value;
        case 'in':
          return Array.isArray(value) && value.includes(fieldValue);
        case 'notIn':
          return Array.isArray(value) && !value.includes(fieldValue);
        case 'contains':
          return typeof fieldValue === 'string' && 
                 typeof value === 'string' && 
                 fieldValue.includes(value);
        case 'startsWith':
          return typeof fieldValue === 'string' && 
                 typeof value === 'string' && 
                 fieldValue.startsWith(value);
        case 'endsWith':
          return typeof fieldValue === 'string' && 
                 typeof value === 'string' && 
                 fieldValue.endsWith(value);
        // Remove the 'deny' case as it's not in the allowed operators
        default:
          console.warn(`Unknown operator: ${String(operator)}`);
          return false;
      }
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  /**
   * Convert object keys to snake_case
   * Handles objects, arrays, and primitive values
   */
  private toSnakeCase<T>(value: T): T {
    // Handle null or undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return (value as any[]).map(v => this.toSnakeCase(v)) as unknown as T;
    }

    // Handle Date objects
    if (value instanceof Date) {
      return value;
    }

    // Handle plain objects
    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).reduce((acc, [key, val]) => {
        // Skip non-string keys
        if (typeof key !== 'string') {
          (acc as any)[key] = val;
          return acc;
        }
        
        // Convert key to snake_case
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        // Recursively process nested objects/arrays
        (acc as any)[snakeKey] = this.toSnakeCase(val);
        return acc;
      }, {} as Record<string, unknown>) as unknown as T;
    }

    // Return primitives as-is
    return value;
  }

  /**
   * Get a nested field from an object using dot notation
   */
  private getNestedField(obj: Record<string, unknown>, path: string): unknown {
    if (!path) return undefined;
    
    try {
      return path.split('.').reduce<unknown>((acc, part) => {
        if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
          return (acc as Record<string, unknown>)[part];
        }
        return undefined;
      }, obj);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Create a permission key from its components
   */
  public static createPermissionKey(
    resource: ResourceType,
    action: PermissionAction,
    level: PermissionLevel = 'own'
  ): string {
    return `${resource}:${action}:${level}`;
  }

  /**
   * Parse a permission key into its components
   */
  public static parsePermissionKey(key: string): {
    resource: ResourceType;
    action: PermissionAction;
    level: PermissionLevel;
  } | null {
    const parts = key.split(':');
    if (parts.length < 2 || parts.length > 3) return null;

    const [resource, action, level = 'own'] = parts;
    return {
      resource: resource as ResourceType,
      action: action as PermissionAction,
      level: level as PermissionLevel
    };
  }
}

/**
 * Default system permissions
 */
// Default system permissions with proper typing
export const defaultSystemPermissions: PermissionDefinition[] = [
  // User management permissions
  {
    id: 'user:create:organization',
    name: 'Create Users',
    description: 'Create new user accounts in the organization',
    resource: 'user',
    action: 'create',
    scope: 'user',
    level: 'organization',
    defaultRoles: ['admin', 'moderator'],
    isSystem: true
  },
  {
    id: 'user:read:own',
    name: 'Read Own User',
    description: 'Read own user profile',
    resource: 'user',
    action: 'read',
    level: 'read',
    scope: 'user',
    allowedRoles: ['user', 'admin', 'moderator', 'superadmin'],
  },
  {
    id: 'user:read:organization',
    name: 'View Users',
    description: 'View user profiles in the organization',
    resource: 'user',
    action: 'read',
    scope: 'user',
    level: 'organization',
    defaultRoles: ['admin', 'moderator', 'user'],
    isSystem: true
  },
  {
    id: 'user:update:organization',
    name: 'Edit Users',
    description: 'Edit user profiles in the organization',
    resource: 'user',
    action: 'update',
    scope: 'user',
    level: 'organization',
    defaultRoles: ['admin', 'manager'],
    isSystem: true
  },
  // Add more default permissions as needed
];

/**
 * Create a new permission manager with default system permissions
 */
export function createPermissionManager(
  customPermissions: PermissionDefinition[] = []
): PermissionManager {
  const manager = new PermissionManager([
    ...defaultSystemPermissions,
    ...customPermissions
  ]);
  return manager;
}

/**
 * Check if a user has the required permission
 */
export function checkPermission(
  manager: PermissionManager,
  role: UserRole,
  resource: ResourceType,
  action: PermissionAction,
  level: PermissionLevel = 'own',
  context: Record<string, any> = {}
): boolean {
  return manager.hasPermission(role, resource, action, level, context);
}
