import { Provider } from 'injection-js';
import { TripRepositoryImpl } from '../../trips/repositories/trip.repository';
import { OrganizationRepositoryImpl } from './organization/organization.repository';
import { ActivityRepositoryImpl } from './activity/activity.repository';
import { UserRepositoryImpl } from './user/user.repository';
import { BookingRepositoryImpl } from './booking/booking.repository';
import { RefreshTokenRepositoryImpl } from '../../auth/repositories/refresh-token.repository';

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
