import { PrismaClient } from '@prisma/client';
import { PrismaUserRepository } from '../repositories/prisma/user.prisma.repository';
import { PrismaRefreshTokenRepository } from '../repositories/prisma/refresh-token.prisma.repository';

export class PrismaService {
  private static instance: PrismaService;
  private _prisma: PrismaClient;
  private _userRepository: PrismaUserRepository;
  private _refreshTokenRepository: PrismaRefreshTokenRepository;

  private constructor() {
    this._prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });

    // Initialize repositories
    this._userRepository = new PrismaUserRepository(this._prisma);
    this._refreshTokenRepository = new PrismaRefreshTokenRepository(this._prisma);
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  public get client(): PrismaClient {
    return this._prisma;
  }

  public get users() {
    return this._userRepository;
  }

  public get refreshTokens() {
    return this._refreshTokenRepository;
  }

  public async connect(): Promise<void> {
    await this._prisma.$connect();
  }

  public async disconnect(): Promise<void> {
    await this._prisma.$disconnect();
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this._prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export a singleton instance
export const prismaService = PrismaService.getInstance();

// Export types for convenience
export type { PrismaClient } from '@prisma/client';

// Export repositories for direct access if needed
export { PrismaUserRepository, PrismaRefreshTokenRepository };
