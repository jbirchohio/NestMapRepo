import { Provider } from '@nestjs/common.js';
import { TripRepositoryImpl } from '@shared/trips/repositories/trip.repository';
import { OrganizationRepositoryImpl } from './organization/organization.repository.js';
import { ActivityRepositoryImpl } from './activity/activity.repository.js';
import { UserRepositoryImpl } from './user/user.repository.js';
import { BookingRepositoryImpl } from './booking/booking.repository.js';
import { UserRepositoryImpl as AuthUserRepositoryImpl } from '@shared/auth/repositories/user.repository';
import { RefreshTokenRepositoryImpl } from '@shared/auth/repositories/refresh-token.repository';

/**
 * Provider definitions for all repositories
 * These can be imported and used in any module that needs repository access
 */

export const TripRepositoryProvider: Provider = {
  provide: 'TripRepository',
  useClass: TripRepositoryImpl,
};

export const OrganizationRepositoryProvider: Provider = {
  provide: 'OrganizationRepository',
  useClass: OrganizationRepositoryImpl,
};

export const ActivityRepositoryProvider: Provider = {
  provide: 'ActivityRepository',
  useClass: ActivityRepositoryImpl,
};

export const UserRepositoryProvider: Provider = {
  provide: 'UserRepository',
  useClass: UserRepositoryImpl,
};

export const BookingRepositoryProvider: Provider = {
  provide: 'BookingRepository',
  useClass: BookingRepositoryImpl,
};

export const AuthUserRepositoryProvider: Provider = {
  provide: 'AuthUserRepository',
  useClass: AuthUserRepositoryImpl,
};

export const RefreshTokenRepositoryProvider: Provider = {
  provide: 'RefreshTokenRepository',
  useClass: RefreshTokenRepositoryImpl,
};

// Combine all repository providers for easy import
export const RepositoryProviders = [
  TripRepositoryProvider,
  OrganizationRepositoryProvider,
  ActivityRepositoryProvider,
  UserRepositoryProvider,
  BookingRepositoryProvider,
  AuthUserRepositoryProvider,
  RefreshTokenRepositoryProvider,
];
