// Comprehensive permission system for role-based access control
export const PERMISSIONS = {
    // Trip Management
    CREATE_TRIPS: 'CREATE_TRIPS',
    VIEW_ALL_TRIPS: 'VIEW_ALL_TRIPS',
    EDIT_ALL_TRIPS: 'EDIT_ALL_TRIPS',
    DELETE_TRIPS: 'DELETE_TRIPS',
    // Booking System
    BOOK_FLIGHTS: 'BOOK_FLIGHTS',
    BOOK_HOTELS: 'BOOK_HOTELS',
    VIEW_BOOKING_HISTORY: 'VIEW_BOOKING_HISTORY',
    CANCEL_BOOKINGS: 'CANCEL_BOOKINGS',
    // Analytics & Reporting
    ACCESS_ANALYTICS: 'ACCESS_ANALYTICS',
    EXPORT_ANALYTICS: 'EXPORT_ANALYTICS',
    VIEW_FINANCIAL_REPORTS: 'VIEW_FINANCIAL_REPORTS',
    // Trip Optimization
    USE_TRIP_OPTIMIZER: 'USE_TRIP_OPTIMIZER',
    BULK_OPTIMIZE_TRIPS: 'BULK_OPTIMIZE_TRIPS',
    // Team Management
    INVITE_MEMBERS: 'INVITE_MEMBERS',
    MANAGE_TEAM_ROLES: 'MANAGE_TEAM_ROLES',
    REMOVE_MEMBERS: 'REMOVE_MEMBERS',
    VIEW_TEAM_ACTIVITY: 'VIEW_TEAM_ACTIVITY',
    // Organization Settings
    MANAGE_ORGANIZATION: 'MANAGE_ORGANIZATION',
    WHITE_LABEL_SETTINGS: 'WHITE_LABEL_SETTINGS',
    API_CONFIGURATION: 'API_CONFIGURATION',
    // Billing & Subscriptions
    BILLING_ACCESS: 'BILLING_ACCESS',
    MANAGE_SUBSCRIPTIONS: 'MANAGE_SUBSCRIPTIONS',
    VIEW_INVOICES: 'VIEW_INVOICES',
    // Admin Functions
    ADMIN_ACCESS: 'ADMIN_ACCESS',
    SYSTEM_SETTINGS: 'SYSTEM_SETTINGS',
    USER_IMPERSONATION: 'USER_IMPERSONATION'
};
// Role-based permission mapping
export const ROLE_PERMISSIONS = {
    guest: [
        PERMISSIONS.CREATE_TRIPS, // Limited to 2 trips
    ],
    user: [
        PERMISSIONS.CREATE_TRIPS,
        PERMISSIONS.VIEW_ALL_TRIPS,
        PERMISSIONS.BOOK_FLIGHTS,
        PERMISSIONS.BOOK_HOTELS,
        PERMISSIONS.VIEW_BOOKING_HISTORY,
        PERMISSIONS.USE_TRIP_OPTIMIZER,
    ],
    manager: [
        PERMISSIONS.CREATE_TRIPS,
        PERMISSIONS.VIEW_ALL_TRIPS,
        PERMISSIONS.EDIT_ALL_TRIPS,
        PERMISSIONS.BOOK_FLIGHTS,
        PERMISSIONS.BOOK_HOTELS,
        PERMISSIONS.VIEW_BOOKING_HISTORY,
        PERMISSIONS.CANCEL_BOOKINGS,
        PERMISSIONS.ACCESS_ANALYTICS,
        PERMISSIONS.EXPORT_ANALYTICS,
        PERMISSIONS.USE_TRIP_OPTIMIZER,
        PERMISSIONS.BULK_OPTIMIZE_TRIPS,
        PERMISSIONS.INVITE_MEMBERS,
        PERMISSIONS.VIEW_TEAM_ACTIVITY,
        PERMISSIONS.BILLING_ACCESS,
        PERMISSIONS.VIEW_INVOICES,
    ],
    admin: [
        PERMISSIONS.CREATE_TRIPS,
        PERMISSIONS.VIEW_ALL_TRIPS,
        PERMISSIONS.EDIT_ALL_TRIPS,
        PERMISSIONS.DELETE_TRIPS,
        PERMISSIONS.BOOK_FLIGHTS,
        PERMISSIONS.BOOK_HOTELS,
        PERMISSIONS.VIEW_BOOKING_HISTORY,
        PERMISSIONS.CANCEL_BOOKINGS,
        PERMISSIONS.ACCESS_ANALYTICS,
        PERMISSIONS.EXPORT_ANALYTICS,
        PERMISSIONS.VIEW_FINANCIAL_REPORTS,
        PERMISSIONS.USE_TRIP_OPTIMIZER,
        PERMISSIONS.BULK_OPTIMIZE_TRIPS,
        PERMISSIONS.INVITE_MEMBERS,
        PERMISSIONS.MANAGE_TEAM_ROLES,
        PERMISSIONS.REMOVE_MEMBERS,
        PERMISSIONS.VIEW_TEAM_ACTIVITY,
        PERMISSIONS.MANAGE_ORGANIZATION,
        PERMISSIONS.WHITE_LABEL_SETTINGS,
        PERMISSIONS.API_CONFIGURATION,
        PERMISSIONS.BILLING_ACCESS,
        PERMISSIONS.MANAGE_SUBSCRIPTIONS,
        PERMISSIONS.VIEW_INVOICES,
        PERMISSIONS.ADMIN_ACCESS,
        PERMISSIONS.SYSTEM_SETTINGS,
    ],
    super_admin: [
        ...Object.values(PERMISSIONS) // All permissions
    ]
};
// Department-specific permission enhancements
export const DEPARTMENT_PERMISSIONS = {
    finance: [
        PERMISSIONS.VIEW_FINANCIAL_REPORTS,
        PERMISSIONS.BILLING_ACCESS,
        PERMISSIONS.MANAGE_SUBSCRIPTIONS,
        PERMISSIONS.VIEW_INVOICES,
    ],
    hr: [
        PERMISSIONS.INVITE_MEMBERS,
        PERMISSIONS.MANAGE_TEAM_ROLES,
        PERMISSIONS.VIEW_TEAM_ACTIVITY,
    ],
    travel_admin: [
        PERMISSIONS.BULK_OPTIMIZE_TRIPS,
        PERMISSIONS.CANCEL_BOOKINGS,
        PERMISSIONS.ACCESS_ANALYTICS,
        PERMISSIONS.EXPORT_ANALYTICS,
    ],
    executive: [
        PERMISSIONS.VIEW_FINANCIAL_REPORTS,
        PERMISSIONS.ACCESS_ANALYTICS,
        PERMISSIONS.EXPORT_ANALYTICS,
        PERMISSIONS.MANAGE_ORGANIZATION,
    ]
};
// Get user permissions based on role and organization - async version
export async function getUserPermissionsByRole(
  userId: string,
  role: string,
  organizationId?: string
): Promise<string[]> {
  const { db } = await import('./db.js');
  const { users, organizations } = await import('./db/schema.js');
  const { eq } = await import('drizzle-orm');
  
  try {
    // Get user's actual role and organization status
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      console.warn(`User not found with ID: ${userId}`);
      return [];
    }
    
    // Get organization subscription level for feature gating
    let subscriptionTier = 'free';
    if (organizationId) {
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId));
      
      if (org?.plan) {
        subscriptionTier = org.plan.toLowerCase();
      }
    }
    
    // Get base permissions for the role
    const rolePermissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
    
    // Get subscription-based permissions
    const subscriptionPermissions = getSubscriptionPermissions(subscriptionTier);
    
    // Combine role and subscription permissions, removing duplicates
    const allPermissions = [...new Set([...rolePermissions, ...subscriptionPermissions])];
    
    // Add admin permissions if user is an admin
    if (role === 'admin' || role === 'superadmin') {
      allPermissions.push(PERMISSIONS.ADMIN_ACCESS);
    }
    
    return allPermissions;
  } catch (error) {
    console.error('Error in getUserPermissionsByRole:', error);
    return [];
  }
}
// Navigation rules based on permissions
export const NAVIGATION_RULES = {
    '/': [], // Dashboard - available to all authenticated users
    '/analytics': [
        PERMISSIONS.ACCESS_ANALYTICS,
        PERMISSIONS.MANAGE_ORGANIZATION
    ],
    '/bookings': [
        PERMISSIONS.BOOK_FLIGHTS,
        PERMISSIONS.BOOK_HOTELS,
        PERMISSIONS.CREATE_TRIPS
    ],
    '/optimizer': [
        PERMISSIONS.USE_TRIP_OPTIMIZER,
        PERMISSIONS.BULK_OPTIMIZE_TRIPS,
        PERMISSIONS.ACCESS_ANALYTICS
    ],
    '/team': [
        PERMISSIONS.INVITE_MEMBERS,
        PERMISSIONS.MANAGE_TEAM_ROLES,
        PERMISSIONS.VIEW_TEAM_ACTIVITY
    ],
    '/billing': [
        PERMISSIONS.BILLING_ACCESS,
        PERMISSIONS.MANAGE_SUBSCRIPTIONS,
        PERMISSIONS.VIEW_INVOICES
    ],
    '/settings': [
        PERMISSIONS.MANAGE_ORGANIZATION,
        PERMISSIONS.WHITE_LABEL_SETTINGS,
        PERMISSIONS.ADMIN_ACCESS
    ]
};
// Feature-level permission checks
export const FEATURE_PERMISSIONS = {
    // Analytics Features
    export_analytics: [PERMISSIONS.EXPORT_ANALYTICS],
    financial_reports: [PERMISSIONS.VIEW_FINANCIAL_REPORTS],
    // Booking Features
    flight_booking: [PERMISSIONS.BOOK_FLIGHTS],
    hotel_booking: [PERMISSIONS.BOOK_HOTELS],
    booking_cancellation: [PERMISSIONS.CANCEL_BOOKINGS],
    // Trip Optimization Features
    single_trip_optimization: [PERMISSIONS.USE_TRIP_OPTIMIZER],
    bulk_trip_optimization: [PERMISSIONS.BULK_OPTIMIZE_TRIPS],
    // Team Management Features
    invite_team_members: [PERMISSIONS.INVITE_MEMBERS],
    change_member_roles: [PERMISSIONS.MANAGE_TEAM_ROLES],
    remove_team_members: [PERMISSIONS.REMOVE_MEMBERS],
    // Organization Features
    white_label_branding: [PERMISSIONS.WHITE_LABEL_SETTINGS],
    api_configuration: [PERMISSIONS.API_CONFIGURATION],
    organization_settings: [PERMISSIONS.MANAGE_ORGANIZATION],
    // Billing Features
    subscription_management: [PERMISSIONS.MANAGE_SUBSCRIPTIONS],
    invoice_access: [PERMISSIONS.VIEW_INVOICES],
    billing_portal: [PERMISSIONS.BILLING_ACCESS]
};
// Helper functions for permission checking
export function getUserPermissions(userRole: string, department?: string): string[] {
    const rolePermissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
    const deptPermissions = department ? DEPARTMENT_PERMISSIONS[department as keyof typeof DEPARTMENT_PERMISSIONS] || [] : [];
    return [...new Set([...rolePermissions, ...deptPermissions])];
}
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission);
}
export function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission => userPermissions.includes(permission));
}
export function canAccessRoute(userPermissions: string[], route: string): boolean {
    const requiredPermissions = NAVIGATION_RULES[route as keyof typeof NAVIGATION_RULES];
    if (!requiredPermissions || requiredPermissions.length === 0) {
        return true; // Route has no restrictions
    }
    return hasAnyPermission(userPermissions, requiredPermissions);
}
export function canUseFeature(userPermissions: string[], feature: string): boolean {
    const requiredPermissions = FEATURE_PERMISSIONS[feature as keyof typeof FEATURE_PERMISSIONS];
    if (!requiredPermissions || requiredPermissions.length === 0) {
        return true; // Feature has no restrictions
    }
    return hasAnyPermission(userPermissions, requiredPermissions);
}
// Subscription tier permissions with inheritance model
const freePermissions = [
    PERMISSIONS.CREATE_TRIPS, // Limited to 3 trips
    PERMISSIONS.VIEW_ALL_TRIPS,
];
const basicPermissions = [
    ...freePermissions,
    PERMISSIONS.USE_TRIP_OPTIMIZER, // Limited usage
    PERMISSIONS.BOOK_FLIGHTS, // Limited bookings
    PERMISSIONS.BOOK_HOTELS, // Limited bookings
];
const proPermissions = [
    ...basicPermissions,
    PERMISSIONS.INVITE_MEMBERS, // Up to 10 users
    PERMISSIONS.ACCESS_ANALYTICS,
    PERMISSIONS.WHITE_LABEL_SETTINGS, // White label access starts here
    PERMISSIONS.BULK_OPTIMIZE_TRIPS,
    PERMISSIONS.EXPORT_ANALYTICS,
];
const businessPermissions = [
    ...proPermissions,
    PERMISSIONS.MANAGE_ORGANIZATION,
    PERMISSIONS.API_CONFIGURATION,
    PERMISSIONS.VIEW_FINANCIAL_REPORTS,
    PERMISSIONS.MANAGE_TEAM_ROLES, // Up to 50 users
    PERMISSIONS.CANCEL_BOOKINGS,
];
const enterprisePermissions = [
    ...businessPermissions,
    PERMISSIONS.ADMIN_ACCESS,
    PERMISSIONS.SYSTEM_SETTINGS,
    PERMISSIONS.USER_IMPERSONATION, // Unlimited users
    PERMISSIONS.BILLING_ACCESS,
    PERMISSIONS.MANAGE_SUBSCRIPTIONS,
];
export const SUBSCRIPTION_PERMISSIONS = {
    free: freePermissions,
    basic: basicPermissions,
    pro: proPermissions,
    business: businessPermissions,
    enterprise: enterprisePermissions,
};
export function getSubscriptionPermissions(tier: string): string[] {
    return SUBSCRIPTION_PERMISSIONS[tier as keyof typeof SUBSCRIPTION_PERMISSIONS] || [];
}
