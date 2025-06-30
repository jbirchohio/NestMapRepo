import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller.js';
import { AuthService } from '../../services/auth.service.js';
import { LoginDto, RegisterDto, AuthResponse } from '@shared/schema/types/auth/jwt/jwt.js';
import { UserRole } from '@shared/schema/types/auth/permissions.js';
import type { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthResponse: AuthResponse = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    accessTokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
    refreshTokenExpiresAt: Math.floor(Date.now() / 1000) + 604800,
    user: {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.USER,
      tenantId: 'tenant1',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    },
    tokenType: 'Bearer',
    expiresIn: 3600,
  };

  const mockResponse = {
    cookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            register: jest.fn(),
            refreshToken: jest.fn(),
            logout: jest.fn(),
            requestPasswordReset: jest.fn(),
            resetPassword: jest.fn(),
            changePassword: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('login', () => {
    it('should return auth response with cookies set', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
        tenantId: 'tenant1',
      };

      const { refreshToken, ...responseWithoutRefresh } = mockAuthResponse;
      authService.login.mockResolvedValue(mockAuthResponse);

      await controller.login[
        controller.login.length - 1
      ](
        { body: loginDto } as any,
        mockResponse,
        jest.fn()
      );

      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        expect.any(String),
        expect.any(String)
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockAuthResponse.refreshToken,
        expect.any(Object)
      );
      expect(mockResponse.json).toHaveBeenCalledWith(responseWithoutRefresh);
    });
  });

  describe('register', () => {
    it('should register a new user and return auth response', async () => {
      const registerDto: RegisterDto = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        tenantId: 'tenant1',
      };

      const { refreshToken, ...responseWithoutRefresh } = mockAuthResponse;
      authService.register.mockResolvedValue(mockAuthResponse);

      await controller.register[
        controller.register.length - 1
      ](
        { body: registerDto } as any,
        mockResponse,
        jest.fn()
      );

      expect(authService.register).toHaveBeenCalledWith(
        registerDto,
        expect.any(String),
        expect.any(String)
      );
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(responseWithoutRefresh);
    });
  });

  describe('refreshToken', () => {
    it('should refresh the access token', async () => {
      const refreshToken = 'valid-refresh-token';
      const { refreshToken: newRefreshToken, ...responseWithoutRefresh } = mockAuthResponse;
      
      authService.refreshToken.mockResolvedValue(mockAuthResponse);
      
      await controller.refreshToken[
        controller.refreshToken.length - 1
      ](
        { 
          cookies: { refreshToken },
          body: { refreshToken } 
        } as any,
        mockResponse,
        jest.fn()
      );

      expect(authService.refreshToken).toHaveBeenCalledWith(
        refreshToken,
        expect.any(String),
        expect.any(String)
      );
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(responseWithoutRefresh);
    });
  });

  // Add more test cases for other controller methods
});
