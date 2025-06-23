import apiClient from './apiClient'; // Default import
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
    private constructor() { }
    public static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }
    // Authentication
    public async login(credentials: {
        email: string;
        password: string;
    }): Promise<{
        user: User;
        token: string;
    }> {
        return apiClient.post<{
            user: User;
            token: string;
        }, typeof credentials>(`${this.authPath}/login`, credentials);
    }
    public async register(userData: {
        email: string;
        password: string;
        username: string;
        firstName?: string;
        lastName?: string;
        organizationId?: number;
    }): Promise<{
        user: User;
        token: string;
    }> {
        return apiClient.post<{
            user: User;
            token: string;
        }, typeof userData>(`${this.authPath}/register`, userData);
    }
    public async refreshToken(): Promise<{
        token: string;
    }> {
        return apiClient.post<{
            token: string;
        }>(`${this.authPath}/refresh-token`);
    }
    public async logout(): Promise<void> {
        return apiClient.post<void>(`${this.authPath}/logout`);
    }
    public async requestPasswordReset(email: string): Promise<{
        message: string;
    }> {
        return apiClient.post<{
            message: string;
        }, {
            email: string;
        }>(`${this.authPath}/request-password-reset`, { email });
    }
    public async resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }> {
        return apiClient.post<{
            message: string;
        }, {
            token: string;
            newPassword: string;
        }>(`${this.authPath}/reset-password`, { token, newPassword });
    }
    // User Management
    public async getCurrentUser(): Promise<User> {
        return apiClient.get<User>(`${this.basePath}/me`);
    }
    public async getUserById(userId: string | number): Promise<User> {
        return apiClient.get<User>(`${this.basePath}/${userId}`);
    }
    public async getUsers(params?: UserListParams): Promise<{
        data: User[];
        total: number;
    }> {
        return apiClient.get<{
            data: User[];
            total: number;
        }>(this.basePath, { params });
    }
    public async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
        return apiClient.post<User, typeof userData>(this.basePath, userData);
    }
    public async updateUser(userId: string | number, updates: Partial<Omit<User, 'id' | 'email' | 'createdAt'>>): Promise<User> {
        return apiClient.put<User, typeof updates>(`${this.basePath}/${userId}`, updates);
    }
    public async deleteUser(userId: string | number): Promise<void> {
        return apiClient.delete<void>(`${this.basePath}/${userId}`);
    }
    // Profile Management
    public async updateProfile(userId: string | number, data: Partial<User>): Promise<User> {
        return apiClient.patch<User, Partial<User>>(`${this.basePath}/${userId}/profile`, data);
    }
    public async updateAvatar(userId: string | number, file: File): Promise<{
        avatarUrl: string;
    }> {
        const formData = new FormData();
        formData.append('avatar', file);
        return apiClient.post<{
            avatarUrl: string;
        }, FormData>(`${this.basePath}/${userId}/avatar`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }
    public async changePassword(userId: string | number, currentPassword: string, newPassword: string): Promise<{
        message: string;
    }> {
        return apiClient.post<{
            message: string;
        }, {
            currentPassword: string;
            newPassword: string;
        }>(`${this.basePath}/${userId}/change-password`, { currentPassword, newPassword });
    }
    // Preferences
    public async getPreferences(userId: string | number): Promise<UserPreferences> {
        return apiClient.get<UserPreferences>(`${this.basePath}/${userId}/preferences`);
    }
    public async updatePreferences(userId: string | number, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
        return apiClient.patch<UserPreferences, Partial<UserPreferences>>(`${this.basePath}/${userId}/preferences`, preferences);
    }
    // Permissions
    public async getPermissions(userId?: string | number): Promise<UserPermissions> {
        const path = userId ? `${this.basePath}/${userId}/permissions` : `${this.basePath}/me/permissions`;
        return apiClient.get<UserPermissions>(path);
    }
    public async getAvailableRoles(): Promise<Array<{
        id: string;
        name: string;
        description: string;
    }>> {
        return apiClient.get<Array<{
            id: string;
            name: string;
            description: string;
        }>>(`${this.basePath}/roles`);
    }
}
export const userService = UserService.getInstance();
