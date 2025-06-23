import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authService } from '../authService';
import { TokenManager } from '@/utils/tokenManager';
import { apiClient } from '../api/apiClient';

// Mock the API client
vi.mock('../api/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock the TokenManager
vi.mock('@/utils/tokenManager', () => {
  return {
    TokenManager: vi.fn().mockImplementation(() => ({
      getAccessToken: vi.fn(),
      getRefreshToken: vi.fn(),
      setTokens: vi.fn(),
      clearTokens: vi.fn(),
      decodeToken: vi.fn(),
    })),
  };
});

describe('AuthService', () => {
  let tokenManager: jest.Mocked<TokenManager>;
  
  beforeEach(() => {
    // Create a fresh instance of the TokenManager mock for each test
    tokenManager = new TokenManager() as jest.Mocked<TokenManager>;
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully log in a user', async () => {
      const mockUser = { id: '1', email: 'test@example.com', firstName: 'Test' };
      const mockTokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };
      
      // Mock the API response
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser, tokens: mockTokens },
        error: null,
      });
      
      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
        tenantId: 'tenant-1',
      });
      
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
        tenantId: 'tenant-1',
      });
      
      expect(tokenManager.setTokens).toHaveBeenCalledWith(mockTokens);
      expect(result).toEqual(mockUser);
    });
    
    it('should throw an error when login fails', async () => {
      const errorMessage = 'Invalid credentials';
      
      // Mock the API response with an error
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: errorMessage, code: 'AUTH_ERROR' },
      });
      
      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrong-password',
          tenantId: 'tenant-1',
        })
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const mockUser = { id: '1', email: 'new@example.com', firstName: 'New' };
      const mockTokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };
      
      // Mock the API response
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser, tokens: mockTokens },
        error: null,
      });
      
      const result = await authService.register({
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        tenantId: 'tenant-1',
      });
      
      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        tenantId: 'tenant-1',
      });
      
      expect(tokenManager.setTokens).toHaveBeenCalledWith(mockTokens);
      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('should clear tokens and call the logout endpoint', async () => {
      await authService.logout();
      
      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(tokenManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should refresh the access token', async () => {
      const mockTokens = { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' };
      
      // Mock the API response
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { tokens: mockTokens },
        error: null,
      });
      
      // Mock the refresh token
      (tokenManager.getRefreshToken as jest.Mock).mockReturnValueOnce('refresh-token');
      
      await authService.refreshToken();
      
      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh-token', {
        refreshToken: 'refresh-token',
      });
      
      expect(tokenManager.setTokens).toHaveBeenCalledWith(mockTokens);
    });
    
    it('should throw an error when no refresh token is available', async () => {
      // Mock no refresh token
      (tokenManager.getRefreshToken as jest.Mock).mockReturnValueOnce(null);
      
      await expect(authService.refreshToken()).rejects.toThrow('No refresh token available');
    });
  });

  describe('getCurrentUser', () => {
    it('should return the current user', async () => {
      const mockUser = { id: '1', email: 'test@example.com', firstName: 'Test' };
      
      // Mock the API response
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });
      
      const result = await authService.getCurrentUser();
      
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });
    
    it('should return null when not authenticated', async () => {
      // Mock the API response with no user
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });
      
      const result = await authService.getCurrentUser();
      expect(result).toBeNull();
    });
  });
});
