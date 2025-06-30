export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
}

// Represents a user object that is safe to be exposed to the client.
export interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  organization_id: string | null;
  is_active: boolean;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}
