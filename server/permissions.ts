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
export async function getUserPermissionsByRole(userId: number, role: string, organizationId?: number): Promise<any> {
  const { db } = await import('./db.js');
  const { users, organizations } = await import('../shared/schema');
  const { eq } = await import('drizzle-orm');

  try {
    // Get user's actual role and organization status
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('User not found');
    }

    // Get organization subscription level for feature gating
    const [org] = organizationId ? await db.select().from(organizations).where(eq(organizations.id, organizationId)) : [null];
    const subscriptionLevel = org?.plan || 'free';

    // Map role to permissions
    const basePermissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || ROLE_PERMISSIONS.user;
    
    // Convert to boolean object for frontend consumption
    const permissionObj: any = {};
    
    // Basic permissions all authenticated users have
    permissionObj.canViewTrips = true;
    permissionObj.canCreateTrips = true;
    permissionObj.canEditTrips = basePermissions.includes(PERMISSIONS.EDIT_ALL_TRIPS);
    permissionObj.canDeleteTrips = basePermissions.includes(PERMISSIONS.DELETE_TRIPS);
    permissionObj.canViewAnalytics = basePermissions.includes(PERMISSIONS.ACCESS_ANALYTICS);
    permissionObj.canManageOrganization = basePermissions.includes(PERMISSIONS.MANAGE_ORGANIZATION);
    permissionObj.canAccessAdmin = basePermissions.includes(PERMISSIONS.ADMIN_ACCESS);
    permissionObj.canManageTeam = basePermissions.includes(PERMISSIONS.MANAGE_TEAM_ROLES);
    permissionObj.canBookFlights = basePermissions.includes(PERMISSIONS.BOOK_FLIGHTS);
    permissionObj.canUseOptimizer = basePermissions.includes(PERMISSIONS.USE_TRIP_OPTIMIZER);
    permissionObj.canAccessBilling = basePermissions.includes(PERMISSIONS.BILLING_ACCESS);
    permissionObj.canWhiteLabel = basePermissions.includes(PERMISSIONS.WHITE_LABEL_SETTINGS) && (subscriptionLevel === 'pro' || subscriptionLevel === 'enterprise');

    return permissionObj;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    // Return minimal permissions on error
    return {
      canViewTrips: true,
      canCreateTrips: true,
      canEditTrips: false,
      canDeleteTrips: false,
      canViewAnalytics: false,
      canManageOrganization: false,
      canAccessAdmin: false,
      canManageTeam: false,
      canBookFlights: true,
      canUseOptimizer: false,
      canAccessBilling: false,
      canWhiteLabel: false
    };
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