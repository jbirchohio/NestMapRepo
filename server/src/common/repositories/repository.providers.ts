import { Provider } from '@nestjs/common';
import { TripRepositoryImpl } from '../../trips/repositories/trip.repository.js';
import { OrganizationRepositoryImpl } from './organization/organization.repository.js';
import { ActivityRepositoryImpl } from './activity/activity.repository.js';
import { UserRepositoryImpl } from './user/user.repository.js';
import { BookingRepositoryImpl } from './booking/booking.repository.js';
import { RefreshTokenRepositoryImpl } from '../../auth/repositories/refresh-token.repository.js';

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
  RefreshTokenRepositoryProvider,
];
