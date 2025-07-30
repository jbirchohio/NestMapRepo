import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTRPCContext } from '../../context';
import { appRouter } from '../index';
import { db } from '../../../db/db';
import { bookings, users, organizations } from '../../../db/schema';
import { eq } from 'drizzle-orm/expressions';

// Mock the database
vi.mock('../../../db/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {
      bookings: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
      },
    },
  },
}));

describe('Bookings Router', () => {
  const caller = appRouter.createCaller({
    ...createTRPCContext({ req: {} as any, res: {} as any }),
    user: {
      id: 'user-123',
      organizationId: 'org-123',
      role: 'member',
    },
  });

  const mockBooking = {
    id: 'booking-123',
    userId: 'user-123',
    tripId: 'trip-123',
    type: 'flight',
    title: 'Test Flight',
    status: 'confirmed',
    startDate: new Date(),
    endDate: new Date(Date.now() + 3600000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a booking', async () => {
      const input = {
        tripId: 'trip-123',
        type: 'flight',
        title: 'Test Flight',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
      };

      // @ts-ignore
      db.insert.mockResolvedValueOnce([mockBooking]);

      const result = await caller.bookings.create(input);
      expect(result).toMatchObject({
        id: 'booking-123',
        title: 'Test Flight',
        status: 'confirmed',
      });
    });
  });

  describe('getById', () => {
    it('should get a booking by id', async () => {
      // @ts-ignore
      db.query.bookings.findFirst.mockResolvedValueOnce(mockBooking);

      const result = await caller.bookings.getById({ id: 'booking-123' });
      expect(result).toMatchObject({
        id: 'booking-123',
        title: 'Test Flight',
      });
    });
  });

  describe('list', () => {
    it('should list bookings with filters', async () => {
      const mockBookings = [mockBooking];
      // @ts-ignore
      db.query.bookings.findMany.mockResolvedValueOnce(mockBookings);

      const result = await caller.bookings.list({
        status: 'confirmed',
        type: 'flight',
        limit: 10,
        offset: 0,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 'booking-123',
        title: 'Test Flight',
      });
    });
  });

  describe('update', () => {
    it('should update a booking', async () => {
      const updateData = {
        id: 'booking-123',
        title: 'Updated Flight',
        status: 'cancelled',
        cancellationReason: 'Changed plans',
      };

      // @ts-ignore
      db.update.mockResolvedValueOnce([{ ...mockBooking, ...updateData }]);

      const result = await caller.bookings.update(updateData);
      expect(result).toMatchObject({
        id: 'booking-123',
        title: 'Updated Flight',
        status: 'cancelled',
      });
    });
  });

  describe('cancel', () => {
    it('should cancel a booking', async () => {
      const cancelledBooking = {
        ...mockBooking,
        status: 'cancelled',
        cancellationReason: 'Test cancellation',
      };

      // @ts-ignore
      db.update.mockResolvedValueOnce([cancelledBooking]);

      const result = await caller.bookings.cancel({
        id: 'booking-123',
        reason: 'Test cancellation',
      });

      expect(result).toMatchObject({
        id: 'booking-123',
        status: 'cancelled',
      });
    });
  });
});
