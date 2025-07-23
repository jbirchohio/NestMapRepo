export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest'
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  permissions?: string[];
  [key: string]: any;
}
