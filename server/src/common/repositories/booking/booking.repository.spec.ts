import { Test } from '@nestjs/testing';
import { BookingRepositoryImpl } from './booking.repository';
import { Logger } from '@nestjs/common';
import { eq } from '../utils/drizzle-shim';;

// Mock the database module
jest.mock('../../../../db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    fn: {
      count: jest.fn()
    },
    groupBy: jest.fn().mockReturnThis(),
  }
}));

// Mock the schema
jest.mock('../../../../db/schema', () => ({
  bookings: {
    id: 'id',
    userId: 'userId',
    tripId: 'tripId',
    providerReferenceId: 'providerReferenceId',
    organizationId: 'organizationId',
    status: 'status',
  }
}));

describe('BookingRepository', () => {
  let repository: BookingRepositoryImpl;
  let mockDb: any;

  beforeEach(async () => {
    // Create a testing module with our repository
    const moduleRef = await Test.createTestingModule({
      providers: [BookingRepositoryImpl],
    }).compile();

    repository = moduleRef.get<BookingRepositoryImpl>(BookingRepositoryImpl);
    
    // Get the mocked db
    mockDb = require('../../../../db').db;
    
    // Mock the Logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find a booking by id', async () => {
      // Arrange
      const mockBooking = { id: '1', name: 'Test Booking' };
      mockDb.returning.mockResolvedValueOnce([mockBooking]);

      // Act
      const result = await repository.findById('1');

      // Assert
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toEqual(mockBooking);
    });

    it('should return null if booking not found', async () => {
      // Arrange
      mockDb.returning.mockResolvedValueOnce([]);

      // Act
      const result = await repository.findById('1');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find bookings by user id', async () => {
      // Arrange
      const mockBookings = [{ id: '1', name: 'Test Booking 1' }, { id: '2', name: 'Test Booking 2' }];
      mockDb.orderBy.mockResolvedValueOnce(mockBookings);

      // Act
      const result = await repository.findByUserId('user1');

      // Assert
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
      expect(result).toEqual(mockBookings);
    });
  });

  describe('create', () => {
    it('should create a new booking', async () => {
      // Arrange
      const bookingData = { userId: 'user1', tripId: 'trip1' };
      const mockBooking = { id: '1', ...bookingData };
      mockDb.returning.mockResolvedValueOnce([mockBooking]);

      // Act
      const result = await repository.create(bookingData as any);

      // Assert
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(bookingData);
      expect(mockDb.returning).toHaveBeenCalled();
      expect(result).toEqual(mockBooking);
    });
  });

  describe('update', () => {
    it('should update a booking', async () => {
      // Arrange
      const bookingData = { status: 'confirmed' };
      const mockBooking = { id: '1', ...bookingData };
      mockDb.returning.mockResolvedValueOnce([mockBooking]);

      // Act
      const result = await repository.update('1', bookingData as any);

      // Assert
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.returning).toHaveBeenCalled();
      expect(result).toEqual(mockBooking);
    });

    it('should return null if booking not found', async () => {
      // Arrange
      mockDb.returning.mockResolvedValueOnce([]);

      // Act
      const result = await repository.update('1', { status: 'confirmed' } as any);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a booking', async () => {
      // Arrange
      mockDb.delete.mockReturnValueOnce({ rowCount: 1 });

      // Act
      const result = await repository.delete('1');

      // Assert
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if booking not found', async () => {
      // Arrange
      mockDb.delete.mockReturnValueOnce({ rowCount: 0 });

      // Act
      const result = await repository.delete('1');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('confirmBooking', () => {
    it('should confirm a booking', async () => {
      // Arrange
      const confirmationDetails = { confirmationCode: 'ABC123' };
      const mockBooking = { id: '1', status: 'confirmed', confirmationDetails };
      mockDb.returning.mockResolvedValueOnce([mockBooking]);

      // Act
      const result = await repository.confirmBooking('1', confirmationDetails);

      // Assert
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.returning).toHaveBeenCalled();
      expect(result).toEqual(mockBooking);
    });
  });

  describe('cancelBooking', () => {
    it('should cancel a booking', async () => {
      // Arrange
      const cancellationReason = 'Customer request';
      const mockBooking = { id: '1', status: 'cancelled', cancellationReason };
      mockDb.returning.mockResolvedValueOnce([mockBooking]);

      // Act
      const result = await repository.cancelBooking('1', cancellationReason);

      // Assert
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.returning).toHaveBeenCalled();
      expect(result).toEqual(mockBooking);
    });
  });
});



