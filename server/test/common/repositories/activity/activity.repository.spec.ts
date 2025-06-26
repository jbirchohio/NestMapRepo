import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { db } from '../../../../db/db.ts';
import { activities } from '../../../../db/schema.ts';
import { ActivityRepositoryImpl } from '../../../../src/common/repositories/activity/activity.repository.js';
import type { 
  Activity, 
  ActivityStatus, 
  ActivityType 
} from '../../../../../shared/types/activity.js';

// Define mock types to match the expected schema
type MockActivity = Omit<Activity, 'date' | 'startDate' | 'endDate' | 'description' | 'type' | 'status'> & {
  date: Date;
  time?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  tag?: string;
  assignedTo?: string;
  notes?: string;
  type: ActivityType;
  status: ActivityStatus;
  order: number;
  completed: boolean;
};

// Helper function to create a mock query builder
const createMockQueryBuilder = () => ({
  findMany: jest.fn().mockResolvedValue([]),
  findFirst: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockImplementation((data) => ({
    ...data.data,
    id: 'activity-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
  update: jest.fn().mockImplementation(({ data }) => ({
    ...data,
    id: 'activity-123',
    updatedAt: new Date(),
  })),
  delete: jest.fn().mockResolvedValue({}),
  deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  where: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ rowCount: 1 }),
});

// Create a more complete mock for the database
type QueryBuilder = {
  values: jest.Mock;
  returning: jest.Mock;
  where: jest.Mock;
  set: jest.Mock;
  execute: jest.Mock;
  delete: jest.Mock;
  update: jest.Mock;
  insert: jest.Mock;
  select: jest.Mock;
  from: jest.Mock;
};

const createQueryBuilder = (): QueryBuilder => ({
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ rowCount: 1 }),
  delete: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
});

// Create a mock for the activities table
const mockActivitiesTable = {
  findMany: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
};

// Create a mock for the database
const mockDb = {
  // Query builder methods
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  insert: jest.fn().mockImplementation(() => createQueryBuilder()),
  update: jest.fn().mockImplementation(() => createQueryBuilder()),
  delete: jest.fn().mockImplementation(() => createQueryBuilder()),
  
  // Direct table access
  query: {
    activities: mockActivitiesTable,
  },
  
  // Table references
  activities: mockActivitiesTable,
  
  // Transactions
  $with: jest.fn().mockReturnThis(),
  transaction: jest.fn(async (callback) => await callback(mockDb)),
  
  // Drizzle ORM specific
  eq: jest.fn().mockImplementation((a, b) => ({ a, b, op: 'eq' })),
  and: jest.fn().mockImplementation((...args) => ({ op: 'and', args })),
  gte: jest.fn().mockImplementation((a, b) => ({ a, b, op: 'gte' })),
  lte: jest.fn().mockImplementation((a, b) => ({ a, b, op: 'lte' })),
  inArray: jest.fn().mockImplementation((a, b) => ({ a, b, op: 'inArray' })),
  sql: jest.fn().mockImplementation((strings, ...values) => ({
    sql: strings.join('?'),
    values,
    op: 'sql',
  })),
} as unknown as typeof db;

// Mock the db module
jest.mock('../../../db/db.js', () => ({
  db: mockDb,
  activities: {
    id: { name: 'id', tableName: 'activities' },
    title: { name: 'title', tableName: 'activities' },
    description: { name: 'description', tableName: 'activities' },
    startDate: { name: 'start_date', tableName: 'activities' },
    endDate: { name: 'end_date', tableName: 'activities' },
    locationName: { name: 'location_name', tableName: 'activities' },
    locationAddress: { name: 'location_address', tableName: 'activities' },
    locationCoordinates: { name: 'location_coordinates', tableName: 'activities' },
    status: { name: 'status', tableName: 'activities' },
    type: { name: 'type', tableName: 'activities' },
    tripId: { name: 'trip_id', tableName: 'activities' },
    organizationId: { name: 'organization_id', tableName: 'activities' },
    createdBy: { name: 'created_by', tableName: 'activities' },
    updatedBy: { name: 'updated_by', tableName: 'activities' },
    createdAt: { name: 'created_at', tableName: 'activities' },
    updatedAt: { name: 'updated_at', tableName: 'activities' },
  },
}));

describe('ActivityRepository', () => {
  let repository: ActivityRepositoryImpl;
  const now = new Date();
  
  // Mock data
  const mockActivity: MockActivity = {
    id: 'activity-123',
    title: 'Test Activity',
    date: now,
    time: '10:00',
    locationName: 'Test Location',
    latitude: 40.7128,
    longitude: -74.0060,
    status: 'pending',
    type: 'other',
    tripId: 'trip-123',
    organizationId: 'org-123',
    createdBy: 'user-123',
    createdAt: now,
    updatedAt: now,
    notes: 'Test notes',
    tag: 'test',
    assignedTo: 'user-123',
    order: 1,
    completed: false,
    travelMode: 'driving'
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ActivityRepositoryImpl],
    }).compile();

    repository = moduleRef.get<ActivityRepositoryImpl>(ActivityRepositoryImpl);
    jest.clearAllMocks();
  });

  describe('findByTripId', () => {
    it('should return activities for a trip', async () => {
      // Mock the database response
      (db.query.activities.findMany as jest.Mock).mockResolvedValueOnce([mockActivity]);

      const result = await repository.findByTripId('trip-123');
      
      expect(result).toEqual([mockActivity]);
      expect(db.query.activities.findMany).toHaveBeenCalledWith({
        where: (activities, { eq }) => eq(activities.tripId, 'trip-123'),
        orderBy: (activities, { asc }) => [asc(activities.date)]
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      (db.query.activities.findMany as jest.Mock).mockRejectedValueOnce(error);

      await expect(repository.findByTripId('trip-123')).rejects.toThrow(error);
    });
  });

  describe('createMany', () => {
    it('should create multiple activities', async () => {
      const activitiesData = [
        { ...mockActivity, id: undefined },
        { ...mockActivity, id: undefined, title: 'Another Activity' }
      ];
      
      // Mock the database response for insert
      const mockInsert = db.insert as jest.Mock;
      const mockValues = jest.fn().mockReturnThis();
      const mockReturning = jest.fn().mockResolvedValue([
        { ...mockActivity, id: 'activity-1' },
        { ...mockActivity, id: 'activity-2', title: 'Another Activity' }
      ]);
      
      mockInsert.mockImplementationOnce(() => ({
        values: mockValues,
        returning: mockReturning,
      }));

      const result = await repository.createMany(activitiesData);
      
      expect(result).toHaveLength(2);
      expect(db.insert).toHaveBeenCalledWith(activities);
      expect(mockValues).toHaveBeenCalledWith(activitiesData);
    });

    it('should return empty array if no activities provided', async () => {
      const result = await repository.createMany([]);
      expect(result).toEqual([]);
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('deleteByTripId', () => {
    it('should delete activities by trip ID', async () => {
      // Mock the database response for delete
      const mockDelete = db.delete as jest.Mock;
      const mockWhere = jest.fn().mockReturnThis();
      const mockExecute = jest.fn().mockResolvedValue({ rowCount: 2 });
      
      mockDelete.mockImplementationOnce(() => ({
        where: mockWhere,
        execute: mockExecute,
      }));

      const result = await repository.deleteByTripId('trip-123');
      
      expect(result).toBe(true);
      expect(db.delete).toHaveBeenCalledWith(activities);
      expect(mockWhere).toHaveBeenCalledWith(expect.any(Object)); // Check for eq(activities.tripId, 'trip-123')
    });

    it('should return false if no activities were deleted', async () => {
      // Mock the database response for delete with no matches
      (db.execute as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

      const result = await repository.deleteByTripId('nonexistent-trip');
      expect(result).toBe(false);
    });
  });

  describe('findByDateRange', () => {
    const startDate = new Date('2023-01-01');
    const endDate = new Date('2023-01-31');

    it('should find activities within date range', async () => {
      // Mock the database response
      (db.query.activities.findMany as jest.Mock).mockResolvedValueOnce([mockActivity]);

      const result = await repository.findByDateRange('trip-123', startDate, endDate);
      
      expect(result).toEqual([mockActivity]);
      expect(db.query.activities.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function)
      });
    });
  });

  describe('reschedule', () => {
    const newStartDate = new Date('2023-02-01T10:00:00Z');
    const newEndDate = new Date('2023-02-01T12:00:00Z');

    it('should reschedule an activity', async () => {
      // Mock the database response for update
      const mockUpdate = db.update as jest.Mock;
      const mockSet = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockReturning = jest.fn().mockResolvedValue([{
        ...mockActivity,
        startDate: newStartDate,
        endDate: newEndDate
      }]);
      
      mockUpdate.mockImplementationOnce(() => ({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      }));

      const result = await repository.reschedule('activity-123', newStartDate, newEndDate);
      
      expect(result).toEqual({
        ...mockActivity,
        startDate: newStartDate,
        endDate: newEndDate
      });
      
      expect(db.update).toHaveBeenCalledWith(activities);
      expect(mockSet).toHaveBeenCalledWith({
        startDate: newStartDate,
        endDate: newEndDate,
        updatedAt: expect.any(Date)
      });
      expect(mockWhere).toHaveBeenCalledWith(expect.any(Object)); // Check for eq(activities.id, 'activity-123')
    });

    it('should return null if activity not found', async () => {
      // Mock the database response for update with no matches
      const mockUpdate = db.update as jest.Mock;
      const mockSet = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockReturning = jest.fn().mockResolvedValue([]);
      
      mockUpdate.mockImplementationOnce(() => ({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      }));

      const result = await repository.reschedule('nonexistent-activity', newStartDate, newEndDate);
      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update activity status', async () => {
      const newStatus: ActivityStatus = 'cancelled';
      
      // Mock the database response for update status
      const mockUpdate = db.update as jest.Mock;
      const mockSet = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockReturning = jest.fn().mockResolvedValue([{
        ...mockActivity,
        status: newStatus
      }]);
      
      mockUpdate.mockImplementationOnce(() => ({
        set: mockSet,
        where: mockWhere,
        returning: mockReturning,
      }));

      const result = await repository.updateStatus('activity-123', newStatus);
      
      expect(result).toEqual({
        ...mockActivity,
        status: newStatus
      });
      
      expect(db.update).toHaveBeenCalledWith(activities);
      expect(mockSet).toHaveBeenCalledWith({
        status: newStatus,
        updatedAt: expect.any(Date)
      });
      expect(mockWhere).toHaveBeenCalledWith(expect.any(Object)); // Check for eq(activities.id, 'activity-123')
    });
  });

  describe('findByType', () => {
    it('should return activities of a specific type', async () => {
      const type: ActivityType = 'event';
      
      // Mock the database response
      (db.query.activities.findMany as jest.Mock).mockResolvedValueOnce([mockActivity]);

      const result = await repository.findByType(type);
      
      expect(result).toEqual([mockActivity]);
      expect(db.query.activities.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function)
      });
    });

    it('should filter by status if provided', async () => {
      const type: ActivityType = 'event';
      const status: ActivityStatus = 'confirmed';
      
      // Mock the database response
      (db.query.activities.findMany as jest.Mock).mockResolvedValueOnce([mockActivity]);

      await repository.findByType(type, status);
      
      expect(db.query.activities.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function)
      });
    });
  });
});
