import { 
  UserRole, 
  PermissionDefinition, 
  PermissionLevel, 
  PermissionCondition, 
  ResourceType,
  PermissionAction,
  PermissionScope
} from '../types/auth/permissions.js'; // Added .js extension for ESM

/**
 * Permission Manager class for handling role-based access control
 */
export class PermissionManager {
  private permissions: Map<string, PermissionDefinition> = new Map();
  private roleHierarchy: Map<UserRole, UserRole[]> = new Map();

  constructor(permissions: PermissionDefinition[] = []) {
    this.initializeRoleHierarchy();
    this.registerPermissions(permissions);
  }

  /**
   * Initialize the role hierarchy
   */
  private initializeRoleHierarchy(): void {
    // Use the UserRole enum values directly to ensure type safety
    const { SUPER_ADMIN, ADMIN, MANAGER, MEMBER, GUEST } = UserRole;
    
    // Explicitly type the role hierarchy to ensure type safety
    const hierarchy: Record<UserRole, UserRole[]> = {
      [SUPER_ADMIN]: [ADMIN, MANAGER, MEMBER, GUEST],
      [ADMIN]: [MANAGER, MEMBER, GUEST],
      [MANAGER]: [MEMBER, GUEST],
      [MEMBER]: [GUEST],
      [GUEST]: []
    };

    // Convert the record to a map
    (Object.entries(hierarchy) as [UserRole, UserRole[]][]).forEach(([role, roles]) => {
      this.roleHierarchy.set(role, roles);
    });
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
    this.permissions.set(permission.key, permission);
  }

  /**
   * Check if a user with the given role has the specified permission
   */
  public hasPermission(
    role: UserRole,
    resource: ResourceType,
    action: PermissionAction,
    level: PermissionLevel = 'own',
    context: Record<string, any> = {}
  ): boolean {
    // Super admin has all permissions
    if (role === UserRole.SUPER_ADMIN) return true;

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
    const rolesToCheck = this.getInheritedRoles(role);
    
    for (const permission of this.permissions.values()) {
      if (rolesToCheck.some(r => permission.defaultRoles.includes(r))) {
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
    const roles: UserRole[] = [role];
    const inheritedRoles = this.roleHierarchy.get(role) || [];
    
    for (const inheritedRole of inheritedRoles) {
      roles.push(inheritedRole);
      roles.push(...this.getInheritedRoles(inheritedRole));
    }
    
    return [...new Set(roles)]; // Remove duplicates
  }

  /**
   * Check if permission level matches the required level
   */
  private matchesLevel(permissionLevel: PermissionLevel, requiredLevel: PermissionLevel): boolean {
    const levelOrder: Record<PermissionLevel, number> = {
      'own': 1,
      'team': 2,
      'organization': 3,
      'all': 4
    };
    
    return levelOrder[permissionLevel] >= levelOrder[requiredLevel];
  }

  /**
   * Evaluate a permission condition against the current context
   */
  private checkCondition(
    condition: PermissionCondition | boolean | ((context: Record<string, any>, resourceId?: string) => boolean) | { condition: PermissionCondition },
    context: Record<string, any>,
    resourceId?: string
  ): boolean {
    if (typeof condition === 'boolean') {
      return condition;
    }

    if (typeof condition === 'function') {
      return condition(context, resourceId);
    }

    // Check if it's an object with a 'condition' property
    if (condition && 
        typeof condition === 'object' && 
        condition !== null && 
        'condition' in condition) {
      const conditionObj = condition as { condition: PermissionCondition };
      return this.checkCondition(conditionObj.condition, context, resourceId);
    }

    // If it's a standard PermissionCondition object
    if (condition && 
        typeof condition === 'object' && 
        'field' in condition && 
        'operator' in condition) {
      return this.evaluateCondition(condition as PermissionCondition, context);
    }

    return false;
  }

  /**
   * Evaluate a permission condition against the current context
   */
  private evaluateCondition(condition: PermissionCondition, context: Record<string, any>): boolean {
    try {
      const { field, operator, value } = condition;
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
  private getNestedField(obj: Record<string, any>, path: string): any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
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
export const defaultSystemPermissions: PermissionDefinition[] = [
  // User management permissions
  {
    key: 'user:create:organization',
    name: 'Create Users',
    description: 'Create new user accounts in the organization',
    resource: 'user',
    action: 'create',
    scope: 'user',
    level: 'organization',
    defaultRoles: [UserRole.ADMIN, UserRole.MANAGER],
    isSystem: true
  },
  {
    key: 'user:read:organization',
    name: 'View Users',
    description: 'View user profiles in the organization',
    resource: 'user',
    action: 'read',
    scope: 'user',
    level: 'organization',
    defaultRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER],
    isSystem: true
  },
  {
    key: 'user:update:organization',
    name: 'Edit Users',
    description: 'Edit user profiles in the organization',
    resource: 'user',
    action: 'update',
    scope: 'user',
    level: 'organization',
    defaultRoles: [UserRole.ADMIN, UserRole.MANAGER],
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
