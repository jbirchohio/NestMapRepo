import type { Provider } from '@nestjs/common';
import type { TripRepositoryImpl } from '../../trips/repositories/trip.repository.ts';
import type { OrganizationRepositoryImpl } from './organization/organization.repository.ts';
import type { ActivityRepositoryImpl } from './activity/activity.repository.ts';
import type { UserRepositoryImpl } from './user/user.repository.ts';
import type { BookingRepositoryImpl } from './booking/booking.repository.ts';
import { UserRepositoryImpl as AuthUserRepositoryImpl } from '../../auth/repositories/user.repository.ts';
import type { RefreshTokenRepositoryImpl } from '../../auth/repositories/refresh-token.repository.ts';
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
