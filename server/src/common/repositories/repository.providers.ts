import type { Provider } from '@nestjs/common';
import { PrismaTripRepository } from '../../trips/repositories/prisma-trip.repository.js';
import { PrismaOrganizationRepository } from './prisma/organization.prisma.repository.js';
import { PrismaActivityRepository } from './prisma/activity.prisma.repository.js';
import { PrismaBookingRepository } from './prisma/booking.prisma.repository.js';
import { PrismaUserRepository } from './prisma/user.prisma.repository.js';
import { PrismaRefreshTokenRepository } from './prisma/refresh-token.prisma.repository.js';
import { PrismaService } from '../database/prisma.service.js';
/**
 * Provider definitions for all repositories
 * These can be imported and used in any module that needs repository access
 */
// Import the singleton instance of PrismaService
import { prismaService } from '../database/prisma.service.js';

// Factory function to create repository instances with Prisma client
const createRepository = <T>(repository: new (prisma: any) => T): T => {
  return new repository(prismaService.client);
};

export const TripRepositoryProvider: Provider = {
  provide: 'TripRepository',
  useFactory: () => createRepository(PrismaTripRepository),
};

export const OrganizationRepositoryProvider: Provider = {
  provide: 'OrganizationRepository',
  useFactory: () => createRepository(PrismaOrganizationRepository),
};

export const ActivityRepositoryProvider: Provider = {
  provide: 'ActivityRepository',
  useFactory: () => createRepository(PrismaActivityRepository),
};

export const BookingRepositoryProvider: Provider = {
  provide: 'BookingRepository',
  useFactory: () => createRepository(PrismaBookingRepository),
};

export const AuthUserRepositoryProvider: Provider = {
  provide: 'AuthUserRepository',
  useFactory: () => createRepository(PrismaUserRepository),
};

export const RefreshTokenRepositoryProvider: Provider = {
  provide: 'RefreshTokenRepository',
  useFactory: () => createRepository(PrismaRefreshTokenRepository),
};
// Combine all repository providers for easy import
export const RepositoryProviders = [
  TripRepositoryProvider,
  OrganizationRepositoryProvider,
  ActivityRepositoryProvider,
  BookingRepositoryProvider,
  AuthUserRepositoryProvider,
  RefreshTokenRepositoryProvider,
  PrismaService, // Make sure PrismaService is provided
];
