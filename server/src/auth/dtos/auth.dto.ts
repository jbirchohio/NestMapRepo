export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface RequestPasswordResetDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'member' | 'guest';

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  user: UserResponse;
  tokenType: string;
  expiresIn: number;
}