export type UserRole = 'user' | 'admin' | 'moderator' | 'superadmin';
type PermissionLevel = 'none' | 'read' | 'write' | 'admin' | 'manage' | 'own' | 'organization' | 'user';
type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage';
type ResourceType = string;
type PermissionScope = 'own' | 'team' | 'organization' | 'global' | 'user';
type PermissionCondition = {
    (context: Record<string, unknown>): boolean;
    field?: string;
    operator?: string;
    value?: unknown;
};
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
    [key: string]: unknown;
}
/**
 * Permission Manager class for handling role-based access control
 */
export declare class PermissionManager {
    private permissions;
    private roleHierarchy;
    constructor(permissions?: PermissionDefinition[]);
    /**
     * Initialize the role hierarchy
     */
    private initializeRoleHierarchy;
    /**
     * Register multiple permissions
     */
    registerPermissions(permissions: PermissionDefinition[]): void;
    /**
     * Register a single permission
     */
    registerPermission(permission: PermissionDefinition): void;
    /**
     * Check if a user with the given role has the specified permission
     */
    hasPermission(role: UserRole, resource: ResourceType, action: PermissionAction, level?: PermissionLevel, context?: Record<string, unknown>): boolean;
    /**
     * Get all permissions for a role, including inherited permissions
     */
    getPermissionsForRole(role: UserRole): PermissionDefinition[];
    /**
     * Get all roles that are lower in the hierarchy than the given role
     */
    getInferiorRoles(role: UserRole): UserRole[];
    /**
     * Get all roles that inherit from the given role
     */
    private getInheritedRoles;
    /**
     * Check if permission level matches the required level
     */
    private matchesLevel;
    /**
     * Get a value from context using dot notation
     */
    private getValueFromContext;
    /**
     * Compare values based on operator
     */
    private compareValues;
    /**
     * Evaluate a permission condition against the current context
     */
    private evaluateCondition;
    /**
     * Convert object keys to snake_case
     * Handles objects, arrays, and primitive values
     */
    private toSnakeCase;
    /**
     * Get a nested field from an object using dot notation
     */
    private getNestedField;
    /**
     * Create a permission key from its components
     */
    static createPermissionKey(resource: ResourceType, action: PermissionAction, level?: PermissionLevel): string;
    /**
     * Parse a permission key into its components
     */
    static parsePermissionKey(key: string): {
        resource: ResourceType;
        action: PermissionAction;
        level: PermissionLevel;
    } | null;
}
/**
 * Default system permissions
 */
export declare const defaultSystemPermissions: PermissionDefinition[];
/**
 * Create a new permission manager with default system permissions
 */
export declare function createPermissionManager(customPermissions?: PermissionDefinition[]): PermissionManager;
/**
 * Check if a user has the required permission
 */
export declare function checkPermission(manager: PermissionManager, role: UserRole, resource: ResourceType, action: PermissionAction, level?: PermissionLevel, context?: Record<string, any>): boolean;
export {};
//# sourceMappingURL=permissions.d.ts.map