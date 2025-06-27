import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service.js';
import { UserRepository } from '../../../common/repositories/user/user.repository.interface.js';
import { RefreshTokenRepository } from '../../interfaces/refresh-token.repository.interface.js';
import { UserRole } from '@shared/src/types/auth/permissions.js';
import { LoginDto, RegisterDto } from '@shared/src/types/auth/dto/index.js';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.USER,
    tenantId: 'tenant1',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  const mockTokens = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'UserRepository',
          useValue: {
            findByEmailAndTenant: jest.fn(),
            create: jest.fn(),
            updatePassword: jest.fn(),
            verifyPassword: jest.fn(),
          },
        },
        {
          provide: 'RefreshTokenRepository',
          useValue: {
            create: jest.fn(),
            revokeByToken: jest.fn(),
            findByToken: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get('UserRepository');
    refreshTokenRepository = module.get('RefreshTokenRepository');
  });

  describe('login', () => {
    it('should return tokens and user data on successful login', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
        tenantId: 'tenant1',
      };

      userRepository.findByEmailAndTenant.mockResolvedValue(mockUser);
      userRepository.verifyPassword.mockResolvedValue(true);
      refreshTokenRepository.create.mockResolvedValue({
        id: '1',
        token: 'mock-refresh-token',
        userId: '1',
        expiresAt: new Date(Date.now() + 604800000),
        revoked: false,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      const result = await service.login(loginDto, '127.0.0.1', 'test-agent');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(loginDto.email);
      expect(userRepository.findByEmailAndTenant).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.tenantId
      );
    });

    it('should throw error for invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
        tenantId: 'tenant1',
      };

      userRepository.findByEmailAndTenant.mockResolvedValue(mockUser);
      userRepository.verifyPassword.mockResolvedValue(false);

      await expect(
        service.login(loginDto, '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should create a new user and return tokens', async () => {
      const registerDto: RegisterDto = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        tenantId: 'tenant1',
      };

      userRepository.findByEmailAndTenant.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        ...mockUser,
        email: 'new@example.com',
      });

      const result = await service.register(registerDto, '127.0.0.1', 'test-agent');

      expect(result).toHaveProperty('accessToken');
      expect(result.user.email).toBe(registerDto.email);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          tenantId: registerDto.tenantId,
        })
      );
    });

    it('should throw error if user already exists', async () => {
      const registerDto: RegisterDto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User',
        tenantId: 'tenant1',
      };

      userRepository.findByEmailAndTenant.mockResolvedValue(mockUser);

      await expect(
        service.register(registerDto, '127.0.0.1', 'test-agent')
      ).rejects.toThrow('User with this email already exists');
    });
  });

  // Add more test cases for refreshToken, logout, changePassword, etc.
});
