import { getApiClient } from '@/services/api/apiClient';

export interface User {
  id: string | number;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: string;
  organizationId?: number;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  preferences?: UserPreferences;
  metadata?: Record<string, any>;
}

export interface UserPreferences {
  language?: string;
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
  notificationSettings?: {
    email?: boolean;
    push?: boolean;
    inApp?: boolean;
  };
  [key: string]: any;
}

export interface UserPermissions {
  permissions: string[];
  role: string;
  organizationId?: number;
  scopes?: string[];
}

export interface UserListParams {
  search?: string;
  role?: string;
  organizationId?: number;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class UserService {
  private static instance: UserService;
  private basePath = '/users';
  private authPath = '/auth';

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // Authentication
  public async login(credentials: { email: string; password: string }): Promise<{ user: User; token: string }> {
    return getApiClient().post<{ user: User; token: string }>(
      `${this.authPath}/login`,
      credentials
    );
  }

  public async register(userData: {
    email: string;
    password: string;
    username: string;
    firstName?: string;
    lastName?: string;
    organizationId?: number;
  }): Promise<{ user: User; token: string }> {
    return getApiClient().post<{ user: User; token: string }>(
      `${this.authPath}/register`,
      userData
    );
  }

  public async refreshToken(): Promise<{ token: string }> {
    return getApiClient().post<{ token: string }>(`${this.authPath}/refresh-token`);
  }

  public async logout(): Promise<void> {
    return getApiClient().post<void>(`${this.authPath}/logout`);
  }

  public async requestPasswordReset(email: string): Promise<{ message: string }> {
    return getApiClient().post<{ message: string }>(
      `${this.authPath}/request-password-reset`,
      { email }
    );
  }

  public async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return getApiClient().post<{ message: string }>(
      `${this.authPath}/reset-password`,
      { token, newPassword }
    );
  }

  // User Management
  public async getCurrentUser(): Promise<User> {
    return getApiClient().get<User>(`${this.basePath}/me`);
  }

  public async getUserById(userId: string | number): Promise<User> {
    return getApiClient().get<User>(`${this.basePath}/${userId}`);
  }

  public async getUsers(params?: UserListParams): Promise<{ data: User[]; total: number }> {
    return getApiClient().get<{ data: User[]; total: number }>(this.basePath, { params });
  }

  public async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return getApiClient().post<User>(this.basePath, userData);
  }

  public async updateUser(
    userId: string | number,
    updates: Partial<Omit<User, 'id' | 'email' | 'createdAt'>>
  ): Promise<User> {
    return getApiClient().put<User>(`${this.basePath}/${userId}`, updates);
  }

  public async deleteUser(userId: string | number): Promise<void> {
    return getApiClient().delete<void>(`${this.basePath}/${userId}`);
  }

  // Profile Management
  public async updateProfile(userId: string | number, data: Partial<User>): Promise<User> {
    return getApiClient().patch<User>(`${this.basePath}/${userId}/profile`, data);
  }

  public async updateAvatar(userId: string | number, file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    return getApiClient().post<{ avatarUrl: string }>(
      `${this.basePath}/${userId}/avatar`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }

  public async changePassword(
    userId: string | number,
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    return getApiClient().post<{ message: string }>(
      `${this.basePath}/${userId}/change-password`,
      { currentPassword, newPassword }
    );
  }

  // Preferences
  public async getPreferences(userId: string | number): Promise<UserPreferences> {
    return getApiClient().get<UserPreferences>(`${this.basePath}/${userId}/preferences`);
  }

  public async updatePreferences(
    userId: string | number,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    return getApiClient().patch<UserPreferences>(
      `${this.basePath}/${userId}/preferences`,
      preferences
    );
  }

  // Permissions
  public async getPermissions(userId?: string | number): Promise<UserPermissions> {
    const path = userId ? `${this.basePath}/${userId}/permissions` : `${this.basePath}/me/permissions`;
    return getApiClient().get<UserPermissions>(path);
  }

  public async getAvailableRoles(): Promise<Array<{ id: string; name: string; description: string }>> {
    return getApiClient().get<Array<{ id: string; name: string; description: string }>>(
      `${this.basePath}/roles`
    );
  }
}

export const userService = UserService.getInstance();
