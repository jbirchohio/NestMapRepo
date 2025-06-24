export interface UserResponse {
  id: string;
  email: string;
  role: import('../permissions.js').UserRole;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}
