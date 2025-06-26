import type { InjectionToken } from '@nestjs/common';

/**
 * Token for the booking repository provider
 */
export const BOOKING_REPOSITORY = 'BOOKING_REPOSITORY' as const;

/**
 * Token for the database connection provider
 */
export const DB_CONNECTION = 'DB_CONNECTION' as const;
