// User role type and constants
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'member' | 'guest';
export const UserRoles = {
    SUPER_ADMIN: 'super_admin' as const,
    ADMIN: 'admin' as const,
    MANAGER: 'manager' as const,
    MEMBER: 'member' as const,
    GUEST: 'guest' as const,
} as const;
// Type for the UserRoles object values
export type UserRoleValue = typeof UserRoles[keyof typeof UserRoles];
export interface User {
    id: string;
    email: string;
    username?: string | null;
    passwordHash: string;
    firstName: string | null;
    lastName: string | null;
    role: UserRole;
    emailVerified: boolean;
    emailVerificationToken: string | null;
    emailVerificationExpires: Date | null;
    passwordResetToken: string | null;
    passwordResetExpires: Date | null;
    resetToken: string | null;
    resetTokenExpires: Date | null;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    lastLogin: Date | null;
    lastLoginAt: Date | null;
    lastLoginIp: string | null;
    mfaSecret: string | null;
    organizationId: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Additional fields that might be present in the database
    passwordChangedAt?: Date | null;
    refreshTokens?: string[] | null;
    profileImageUrl?: string | null;
    timezone?: string | null;
    preferredLanguage?: string | null;
    metadata?: Record<string, any> | null;
}
// Helper function to check if a string is a valid UserRole
export function isUserRole(role: string): role is UserRole {
    return [
        UserRoles.SUPER_ADMIN,
        UserRoles.ADMIN,
        UserRoles.MANAGER,
        UserRoles.MEMBER,
        UserRoles.GUEST
    ].includes(role as UserRole);
}
// Helper function to get a default role
export function getDefaultUserRole(): UserRole {
    return UserRoles.MEMBER;
}
