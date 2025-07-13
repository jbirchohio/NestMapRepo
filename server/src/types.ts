// User role types
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

// User interface
export interface User {
  id: string;
  email: string;
  role: UserRole;
  organization_id?: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}