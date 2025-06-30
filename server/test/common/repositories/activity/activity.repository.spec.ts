import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { eq, and, inArray, sql, type SQL, asc } from 'drizzle-orm';
import { activities } from '../../../../db/schema/index.js';
import { ActivityRepositoryImpl } from '../../../../src/common/repositories/activity/activity.repository.js';
import type {
  ActivityStatus,
  ActivityType
} from '@shared/schema/types/activity/index.js';
import type { Activity, NewActivity } from '@db/schema/activities/activities.js';

// Define mock activity data for testing
const createMockActivity = (overrides: Partial<NewActivity> = {}): NewActivity => ({
  id: 'test-activity-1',
  tripId: 'trip-123',
  organizationId: 'org-123',
  title: 'Test Activity',
  description: 'Test description',
  type: 'other',
  status: 'pending',
  date: new Date('2023-01-01T10:00:00Z'),
  startDate: new Date('2023-01-01T10:00:00Z'),
  endDate: new Date('2023-01-01T12:00:00Z'),
  locationName: 'Test Location',
  address: '123 Test St',
  tag: 'test',
  order: 1,
  completed: false,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

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

// Create a mock database instance
const createMockDb = () => ({
  query: {
    activities: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([createMockActivity()]),
      where: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    },
  },
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([createMockActivity()]),
  execute: jest.fn().mockResolvedValue([createMockActivity()]),
});

describe('ActivityRepository', () => {
  let repository: ActivityRepositoryImpl;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDb = createMockDb();
    
    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityRepositoryImpl,
        {
          provide: 'DB',
          useValue: mockDb,
        },
      ],
    }).compile();

    repository = moduleRef.get<ActivityRepositoryImpl>(ActivityRepositoryImpl);
  });

  describe('findByTripId', () => {
    it('should return activities for a trip', async () => {
      const mockActivity = createMockActivity({
        id: 'activity-123',
        tripId: 'trip-123',
      });

      mockDb.query.activities.findMany.mockResolvedValueOnce([mockActivity]);

      const result = await repository.findByTripId('trip-123');

      expect(result).toEqual([mockActivity]);
      expect(mockDb.query.activities.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function),
      });
      
      // Test the where function
      const whereFn = mockDb.query.activities.findMany.mock.calls[0][0].where;
      expect(whereFn(activities, { eq })).toEqual(eq(activities.tripId, 'trip-123'));
      
      // Test the orderBy function
      const orderByFn = mockDb.query.activities.findMany.mock.calls[0][0].orderBy;
      expect(orderByFn(activities, { asc })).toEqual([asc(activities.order)]);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockDb.query.activities.findMany.mockRejectedValueOnce(error);

      await expect(repository.findByTripId('trip-123')).rejects.toThrow('Failed to find activities for trip');
      expect(mockDb.query.activities.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function)
      });
    });
  });

  describe('findById', () => {
    it('should find an activity by id', async () => {
      const mockActivity = createMockActivity({ id: 'activity-123' });
      mockDb.query.activities.findFirst.mockResolvedValueOnce(mockActivity);

      const result = await repository.findById('activity-123');
      
      expect(result).toEqual(mockActivity);
      expect(mockDb.query.activities.findFirst).toHaveBeenCalledWith({
        where: expect.any(Function)
      });
      
      const whereFn = mockDb.query.activities.findFirst.mock.calls[0][0].where;
      expect(whereFn(activities, { eq })).toEqual(eq(activities.id, 'activity-123'));
    });

    it('should return null if activity not found', async () => {
      mockDb.query.activities.findFirst.mockResolvedValueOnce(null);

      const result = await repository.findById('non-existent-id');
      
      expect(result).toBeNull();
      expect(mockDb.query.activities.findFirst).toHaveBeenCalledWith({
        where: expect.any(Function)
      });
      
      const whereFn = mockDb.query.activities.findFirst.mock.calls[0][0].where;
      expect(whereFn(activities, { eq })).toEqual(eq(activities.id, 'non-existent-id'));
    });
  });

  describe('createMany', () => {
    it('should create multiple activities', async () => {
      const activitiesData = [
        { ...createMockActivity(), id: undefined },
        { ...createMockActivity(), id: undefined, title: 'Another Activity' }
      ];
      
      const mockInsert = jest.fn().mockReturnThis();
      const mockValues = jest.fn().mockReturnThis();
      const mockReturning = jest.fn().mockResolvedValue([
        { ...createMockActivity(), id: 'activity-1' },
        { ...createMockActivity(), id: 'activity-2', title: 'Another Activity' }
      ]);
      
      mockInsert.mockImplementationOnce(() => ({
        values: mockValues.mockImplementation(() => ({
          returning: mockReturning
        }))
      }));
      
      mockDb.insert = mockInsert as any;

      const result = await repository.createMany(activitiesData);
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('activity-1');
      expect(result[1].id).toBe('activity-2');
      expect(result[1].title).toBe('Another Activity');
      
      expect(mockInsert).toHaveBeenCalledWith(activities);
      expect(mockValues).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          ...activitiesData[0],
          id: undefined,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        }),
        expect.objectContaining({
          ...activitiesData[1],
          id: undefined,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      ]));
    });  

    it('should return empty array if no activities provided', async () => {
      const result = await repository.createMany([]);
      expect(result).toEqual([]);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('findByDateRange', () => {
    const startDate = new Date('2023-01-01T00:00:00Z');
    const endDate = new Date('2023-01-31T23:59:59Z');

    it('should find activities within date range', async () => {
      const mockActivity = createMockActivity();
      mockDb.query.activities.findMany.mockResolvedValueOnce([mockActivity]);

      const result = await repository.findByDateRange('trip-123', startDate, endDate);
      
      expect(result).toEqual([mockActivity]);
      expect(mockDb.query.activities.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function)
      });
      
      // Test the where function
      const whereFn = mockDb.query.activities.findMany.mock.calls[0][0].where;
      const mockAnd = jest.fn();
      const mockGte = jest.fn();
      const mockLte = jest.fn();
      
      whereFn(activities, { and: mockAnd, gte: mockGte, lte: mockLte, eq: jest.fn() });
      
      expect(mockAnd).toHaveBeenCalled();
      expect(mockGte).toHaveBeenCalledWith(activities.date, startDate);
      expect(mockLte).toHaveBeenCalledWith(activities.date, endDate);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockDb.query.activities.findMany.mockRejectedValueOnce(error);

      await expect(repository.findByDateRange('trip-123', startDate, endDate))
        .rejects.toThrow('Failed to find activities for date range');
      expect(mockDb.query.activities.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function)
      });
    });
  });

  describe('reschedule', () => {
    const newStartDate = new Date('2023-02-01T10:00:00Z');
    const newEndDate = new Date('2023-02-01T12:00:00Z');

    it('should reschedule an activity', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockSet = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      
      mockUpdate.mockImplementation(() => ({
        set: mockSet.mockImplementation(() => ({
          where: mockWhere.mockImplementation(() => ({
            returning: jest.fn().mockResolvedValue([{
              ...createMockActivity(),
              startDate: newStartDate,
              endDate: newEndDate
            }])
          }))
        }))
      }));
      
      mockDb.update = mockUpdate as any;

      const result = await repository.reschedule('activity-123', newStartDate, newEndDate);
      
      expect(result).toEqual(expect.objectContaining({
        startDate: newStartDate,
        endDate: newEndDate
      }));
      
      expect(mockUpdate).toHaveBeenCalledWith(activities);
      expect(mockSet).toHaveBeenCalledWith({
        startDate: newStartDate,
        endDate: newEndDate,
        updatedAt: expect.any(Date)
      });
      
      // Test the where function
      const whereFn = mockWhere.mock.calls[0][0];
      const mockEq = jest.fn();
      whereFn(activities, { eq: mockEq });
      expect(mockEq).toHaveBeenCalledWith(activities.id, 'activity-123');
    });

    it('should return null if activity not found', async () => {
      const mockUpdate = jest.fn().mockReturnThis();
      const mockSet = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      
      mockUpdate.mockImplementation(() => ({
        set: mockSet.mockImplementation(() => ({
          where: mockWhere.mockImplementation(() => ({
            returning: jest.fn().mockResolvedValue([])
          }))
        }))
      }));
      
      mockDb.update = mockUpdate as any;

      const result = await repository.reschedule('nonexistent-activity', newStartDate, newEndDate);
      expect(result).toBeNull();
    });
  });

  describe('findByType', () => {
    const type: ActivityType = 'other';
    
    it('should find activities by type', async () => {
      const mockActivity = createMockActivity();
      mockDb.query.activities.findMany.mockResolvedValueOnce([mockActivity]);

      const result = await repository.findByType(type);
      
      expect(result).toEqual([mockActivity]);
      expect(mockDb.query.activities.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function)
      });
      
      // Test the where function
      const whereFn = mockDb.query.activities.findMany.mock.calls[0][0].where;
      const mockEq = jest.fn();
      whereFn(activities, { eq: mockEq });
      expect(mockEq).toHaveBeenCalledWith(activities.type, type);
    });
    
    it('should filter by status if provided', async () => {
      const status: ActivityStatus = 'confirmed';
      mockDb.query.activities.findMany.mockResolvedValueOnce([createMockActivity()]);

      await repository.findByType(type, status);
      
      // Test the where function with status filter
      const whereFn = mockDb.query.activities.findMany.mock.calls[0][0].where;
      const mockAnd = jest.fn();
      const mockEq = jest.fn();
      
      whereFn(activities, { and: mockAnd, eq: mockEq });
      
      expect(mockAnd).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith(activities.type, type);
      expect(mockEq).toHaveBeenCalledWith(activities.status, status);
    });
    
    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockDb.query.activities.findMany.mockRejectedValueOnce(error);

      await expect(repository.findByType(type))
        .rejects.toThrow('Failed to find activities by type');
      expect(mockDb.query.activities.findMany).toHaveBeenCalledWith({
        where: expect.any(Function),
        orderBy: expect.any(Function)
      });
    });
  });

  describe('delete', () => {
    let mockDelete: jest.Mock;
    let mockWhere: jest.Mock;

    beforeEach(() => {
      mockDelete = jest.fn().mockReturnThis();
      mockWhere = jest.fn().mockReturnThis();
      
      mockDb.delete = mockDelete as any;
    });

    it('should delete an activity', async () => {
      mockWhere.mockImplementationOnce(() => ({
        returning: jest.fn().mockResolvedValue([{ id: 'activity-123' }])
      }));
      
      mockDelete.mockImplementationOnce(() => ({
        where: mockWhere
      }));

      const result = await repository.delete('activity-123');
      
      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith(activities);
      
      // Test the where function
      const whereFn = mockWhere.mock.calls[0][0];
      const mockEq = jest.fn();
      whereFn(activities, { eq: mockEq });
      expect(mockEq).toHaveBeenCalledWith(activities.id, 'activity-123');
    });
    
    it('should return false if activity not found', async () => {
      mockWhere.mockImplementationOnce(() => ({
        returning: jest.fn().mockResolvedValue([])
      }));
      
      mockDelete.mockImplementationOnce(() => ({
        where: mockWhere
      }));

      const result = await repository.delete('non-existent-activity');
      
      expect(result).toBe(false);
      expect(mockDelete).toHaveBeenCalledWith(activities);
      
      // Test the where function
      const whereFn = mockWhere.mock.calls[0][0];
      const mockEq = jest.fn();
      whereFn(activities, { eq: mockEq });
      expect(mockEq).toHaveBeenCalledWith(activities.id, 'non-existent-activity');
    });
    
    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockWhere.mockImplementationOnce(() => ({
        returning: jest.fn().mockRejectedValue(error)
      }));
      
      mockDelete.mockImplementationOnce(() => ({
        where: mockWhere
      }));

      await expect(repository.delete('activity-123'))
        .rejects.toThrow('Failed to delete activity');
      expect(mockDelete).toHaveBeenCalledWith(activities);
    });
  });
});
