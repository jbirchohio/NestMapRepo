import type { Booking as DbBooking } from '../../db/schema/index.js';
import type { BaseBooking, ServerBooking, AnyBooking } from '@shared/types/booking/index.js';
/**
 * Maps a database booking to a server booking
 */
export function mapDbToServerBooking(dbBooking: DbBooking): ServerBooking {
  return {
    id: dbBooking.id,
    userId: dbBooking.userId,
    type: dbBooking.type,
    status: dbBooking.status,
    startDate: dbBooking.checkInDate?.toISOString() ?? new Date().toISOString(),
    endDate: dbBooking.checkOutDate?.toISOString() ?? new Date().toISOString(),
    totalPrice: dbBooking.amount ?? 0,
    currency: dbBooking.currency ?? 'USD',
    referenceNumber: dbBooking.reference,
    notes: dbBooking.notes ?? undefined,
    tripId: dbBooking.tripId,
    organizationId: dbBooking.organizationId,
    metadata: dbBooking.metadata ? JSON.parse(JSON.stringify(dbBooking.metadata)) : undefined,
    createdAt: dbBooking.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: dbBooking.updatedAt?.toISOString() ?? new Date().toISOString(),
    cancelledAt: dbBooking.cancelledAt?.toISOString() ?? null,
    cancelledBy: dbBooking.cancelledBy ?? null
  };
}

/**
 * Maps a server booking to a database booking
 */
export function mapServerToDbBooking(booking: Partial<ServerBooking>): Partial<DbBooking> {
  return {
    id: booking.id,
    userId: booking.userId,
    type: booking.type as any, // Type assertion since we validate this elsewhere
    status: booking.status as any, // Type assertion since we validate this elsewhere
    reference: booking.referenceNumber,
    bookingDate: booking.createdAt ? new Date(booking.createdAt) : new Date(),
    checkInDate: booking.startDate ? new Date(booking.startDate) : null,
    checkOutDate: booking.endDate ? new Date(booking.endDate) : null,
    amount: booking.totalPrice,
    currency: booking.currency,
    notes: booking.notes ?? null,
    tripId: booking.tripId ?? null,
    organizationId: booking.organizationId,
    metadata: booking.metadata ? JSON.parse(JSON.stringify(booking.metadata)) : null,
    cancelledAt: booking.cancelledAt ? new Date(booking.cancelledAt) : null,
    cancelledBy: booking.cancelledBy ?? null
  };
}

/**
 * Maps a database booking to a base booking (shared type)
 */
export function mapDbToBaseBooking(dbBooking: DbBooking): BaseBooking {
  return {
    id: dbBooking.id,
    userId: dbBooking.userId,
    type: dbBooking.type,
    status: dbBooking.status,
    startDate: dbBooking.checkInDate?.toISOString() ?? new Date().toISOString(),
    endDate: dbBooking.checkOutDate?.toISOString() ?? new Date().toISOString(),
    totalPrice: dbBooking.amount ?? 0,
    currency: dbBooking.currency ?? 'USD',
    referenceNumber: dbBooking.reference,
    notes: dbBooking.notes ?? undefined,
    tripId: dbBooking.tripId ?? undefined,
    organizationId: dbBooking.organizationId,
    metadata: dbBooking.metadata ? JSON.parse(JSON.stringify(dbBooking.metadata)) : undefined
  };
}
