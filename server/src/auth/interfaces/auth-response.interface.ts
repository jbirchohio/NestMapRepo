import { User as SharedUser } from '@shared/schema/types/user';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  refresh_expires_at: string;
}

export interface AuthResponse {
  user: SharedUser;
  tokens: AuthTokens;
}
