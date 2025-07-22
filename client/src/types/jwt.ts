export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  exp?: number; // Made optional since jsonwebtoken sets this when using expiresIn
  iat: number;
  jti: string;
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}
