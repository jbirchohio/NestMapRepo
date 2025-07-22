/**
 * Mock database connection for tests
 */

const mockUsers = new Map([
  ['analytics-test@example.com', {
    id: '1',
    email: 'analytics-test@example.com',
    username: 'analyticsuser',
    firstName: 'Analytics',
    lastName: 'User',
    role: 'admin',
    organizationId: '1',
    passwordHash: '$2b$12$LRvyX3F.XbP6FU2YbzG3uu1GX3X3F.XbP6FU2YbzG3uu1GX3X3F.Xb', // mock hash
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    emailVerified: true,
  }],
  ['org-test@example.com', {
    id: '2',
    email: 'org-test@example.com', 
    username: 'orguser',
    firstName: 'Org',
    lastName: 'User',
    role: 'admin',
    organizationId: '1',
    passwordHash: '$2b$12$LRvyX3F.XbP6FU2YbzG3uu1GX3X3F.XbP6FU2YbzG3uu1GX3X3F.Xb',
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    emailVerified: true,
  }],
  ['test@example.com', {
    id: '3',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: 'member',
    organizationId: '1',
    passwordHash: '$2b$12$LRvyX3F.XbP6FU2YbzG3uu1GX3X3F.XbP6FU2YbzG3uu1GX3X3F.Xb',
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    emailVerified: true,
  }]
]);

const mockOrganizations = new Map([
  ['1', {
    id: '1',
    name: 'Test Organization',
    slug: 'test-org',
    plan: 'pro',
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: {},
  }]
]);

const mockTrips = new Map();
const mockWhiteLabelSettings = new Map();

export const connectDatabase = jest.fn().mockResolvedValue(void 0);
export const closeDatabase = jest.fn().mockResolvedValue(void 0);

export const getDatabase = jest.fn(() => ({
  select: jest.fn().mockReturnValue({
    from: jest.fn().mockImplementation((table: any) => {
      return {
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockImplementation(() => {
            // Return appropriate mock data based on the table
            const values = Array.from(mockUsers.values());
            return Promise.resolve(values.slice(0, 1));
          })
        })
      };
    })
  }),
  insert: jest.fn().mockImplementation((table: any) => ({
    values: jest.fn().mockImplementation((data: any) => ({
      returning: jest.fn().mockImplementation(() => {
        // Generate mock data for insert operations
        const newRecord = {
          id: String(Date.now()),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Store in appropriate mock collection based on data
        if (data.email) {
          // User data
          mockUsers.set(data.email, newRecord);
        } else if (data.name) {
          // Organization data
          mockOrganizations.set(newRecord.id, newRecord);
        }
        
        return Promise.resolve([newRecord]);
      })
    }))
  })),
  update: jest.fn().mockImplementation((table: any) => ({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([])
    })
  })),
  delete: jest.fn().mockImplementation((table: any) => ({
    where: jest.fn().mockResolvedValue([])
  }))
}));

export default {
  connectDatabase,
  getDatabase,
  closeDatabase,
};