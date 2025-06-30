import { 
  Injectable, 
  Logger, 
  Scope, 
  UnauthorizedException, 
  ForbiddenException, 
  BadRequestException, 
  ConflictException, 
  NotFoundException,
  Inject
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User as PrismaUser, UserRole, Organization } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { Redis } from 'ioredis';
import { REQUEST } from '@nestjs/core';

// Core services
import { PrismaService } from '@server/core/database/prisma.service.js';

// Shared types
import type { 
  LoginDto, 
  RegisterDto, 
  ResetPasswordDto, 
  ChangePasswordDto,
  AuthResponse,
  AuthTokens,
  AccessTokenPayload,
  RefreshTokenPayload
} from '@shared/schema/types/auth/index.js';
import type { 
  User as SharedUser, 
  UserRole as SharedUserRole 
} from '@shared/schema/types/user/index.js';

// Helper to create a slug from a string
const slugify = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

// Token expiration times in seconds
const TOKEN_EXPIRATION = {
  ACCESS: 15 * 60, // 15 minutes
  REFRESH: 7 * 24 * 60 * 60, // 7 days
  PASSWORD_RESET: 60 * 60, // 1 hour
  EMAIL_VERIFICATION: 24 * 60 * 60, // 24 hours
};

// This is the correct pattern for RLS with Prisma extensions in NestJS.
// It defines the extension logic separately, which can then be applied to the Prisma client instance.
const RLS = (tenantId: string) => {
  return Prisma.defineExtension((prisma) => {
    return prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const [, result] = await prisma.$transaction([
              prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, TRUE)`,
              query(args),
            ]);
            return result;
          },
        },
      },
    });
  });
};

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptRounds = 10;
  private readonly defaultUserRole: UserRole = UserRole.MEMBER;
  
  // The `any` type is a targeted workaround for a known Prisma bug where extension typings
  // are lost when used inside a class. This allows the code to compile while preserving
  // the correct runtime behavior of the extended Prisma client.
  private prisma: any;

  constructor(
    prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @Inject(REQUEST) private readonly request?: Request
  ) {
    const tenantId = this.request?.headers['x-tenant-id'] as string;
    if (tenantId) {
      this.prisma = prisma.$extends(RLS(tenantId));
    } else {
      this.prisma = prisma;
    }
  }

  private toAuthUser(user: PrismaUser & { organization?: Organization | null }): SharedUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role as SharedUserRole, // Direct mapping is safe if enums are aligned
      organizationId: user.organizationId ?? undefined,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLoginAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      isActive: user.isActive,
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, firstName, lastName } = registerDto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      this.logger.warn(`Registration attempt for existing email: ${email}`);
      throw new ConflictException(`User with email ${email} already exists.`);
    }

    const hashedPassword = await hash(password, this.bcryptRounds);
    const orgName = `${firstName}'s Organization`;

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        role: this.defaultUserRole,
        isActive: true,
        emailVerified: false,
        organization: {
          create: {
            name: orgName,
            slug: slugify(orgName),
          },
        },
      },
      include: {
        organization: true,
      },
    });

    this.logger.log(`User registered successfully: ${user.id}`);

    const tokens = await this.generateTokens(user);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: this.toAuthUser(user),
      tokens,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const userRecord = await this.prisma.user.findUnique({ 
      where: { email: loginDto.email },
      include: { organization: true }
    });

    if (!userRecord || !(await compare(loginDto.password, userRecord.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(userRecord);

    await this.prisma.user.update({
      where: { id: userRecord.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: this.toAuthUser(userRecord),
      tokens,
    };
  }

    async generateTokens(user: PrismaUser): Promise<AuthTokens> {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);
    const accessTokenExpiresAt = Date.now() + TOKEN_EXPIRATION.ACCESS * 1000;
    const refreshTokenExpiresAt = Date.now() + TOKEN_EXPIRATION.REFRESH * 1000;

        return {
      tokenType: 'Bearer',
      accessToken: accessToken,
            expiresAt: new Date(accessTokenExpiresAt).toISOString(),
      accessTokenExpiresAt: new Date(accessTokenExpiresAt),
      refreshToken: refreshToken,
      refreshTokenExpiresAt: new Date(refreshTokenExpiresAt),
    };
  }

  private async generateAccessToken(user: PrismaUser): Promise<string> {
        const payload: AccessTokenPayload = {
      jti: uuidv4(),
      sub: user.id,
      email: user.email,
      role: user.role as SharedUserRole,
      permissions: this.getUserPermissions(user.role),
      organizationId: user.organizationId ?? undefined,
      type: 'access',
    };
    return this.jwtService.signAsync(payload, { expiresIn: TOKEN_EXPIRATION.ACCESS });
  }

  private async generateRefreshToken(user: PrismaUser): Promise<string> {
        const payload: RefreshTokenPayload = {
      jti: uuidv4(),
      sub: user.id,
      type: 'refresh',
    };

    const token = await this.jwtService.signAsync(payload, {
      expiresIn: TOKEN_EXPIRATION.REFRESH,
    });

    await this.redis.set(
      `refresh_token:${user.id}:${payload.jti}`,
      '1',
      'EX',
      TOKEN_EXPIRATION.REFRESH
    );

    return token;
  }

  private getUserPermissions(role: UserRole): string[] {
    const rolePermissions: Record<string, string[]> = {
      [UserRole.SUPER_ADMIN]: ['*'],
      [UserRole.ADMIN]: ['read:profile', 'update:profile', 'manage:users'],
      [UserRole.MANAGER]: ['read:profile', 'update:profile', 'manage:team'],
      [UserRole.MEMBER]: ['read:profile', 'update:profile'],
      [UserRole.GUEST]: ['read:public'],
    };
    return rolePermissions[role] || [];
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      this.logger.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    const token = uuidv4();
            await this.prisma['passwordResetToken'].create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_EXPIRATION.PASSWORD_RESET * 1000),
      },
    });

    this.logger.log(`Password reset token for ${user.email}: ${token}`);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<boolean> {
    const { token, newPassword } = resetPasswordDto;

            const passwordResetToken = await this.prisma['passwordResetToken'].findUnique({
      where: { token },
    });

    if (!passwordResetToken || passwordResetToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const hashedPassword = await hash(newPassword, this.bcryptRounds);

    await this.prisma.user.update({
      where: { id: passwordResetToken.userId },
      data: { passwordHash: hashedPassword },
    });

            await this.prisma['passwordResetToken'].delete({ where: { token } });

    return true;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<boolean> {
    const { currentPassword, newPassword } = changePasswordDto;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !(await compare(currentPassword, user.passwordHash))) {
      throw new BadRequestException('Invalid current password');
    }

    const hashedPassword = await hash(newPassword, this.bcryptRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return true;
  }

  async verifyRefreshToken(token: string): Promise<SharedUser | null> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token);

      const tokenExists = await this.redis.get(`refresh_token:${payload.sub}:${payload.jti}`);
      if (!tokenExists) {
        throw new UnauthorizedException('Refresh token has been revoked or is invalid');
      }

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.toAuthUser(user);
    } catch (error) {
      this.logger.error('Refresh token verification failed', error);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async revokeRefreshToken(userId: string, jti: string): Promise<void> {
    await this.redis.del(`refresh_token:${userId}:${jti}`);
  }

  async generateEmailVerificationToken(userId: string): Promise<string> {
    const token = uuidv4();
            await this.prisma['emailVerificationToken'].create({
      data: {
        token,
        userId,
        expiresAt: new Date(Date.now() + TOKEN_EXPIRATION.EMAIL_VERIFICATION * 1000),
      },
    });
    return token;
  }

  async verifyEmail(token: string): Promise<boolean> {
            const verification = await this.prisma['emailVerificationToken'].findUnique({
      where: { token },
    });

    if (!verification || verification.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired email verification token');
    }

    await this.prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true },
    });

            await this.prisma['emailVerificationToken'].delete({ where: { token } });

    return true;
  }
}
