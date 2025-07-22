/**
 * Mock database connection for tests
 */
/// <reference types="jest" />
const mockUser = {
  id: 1,
  email: 'test@example.com',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  role: 'member',
  organizationId: 1,
  passwordHash: '$2b$12$LRvyX3F.XbP6FU2YbzG3uu1GX3X3F.XbP6FU2YbzG3uu1GX3X3F.Xb', // mock hash
  lastLoginAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
  emailVerified: true,
};

export const connectDatabase = jest.fn().mockResolvedValue(void 0);
export const closeDatabase = jest.fn().mockResolvedValue(void 0);

export const getDatabase = jest.fn(() => ({
  select: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockImplementation(() => {
          // Check if we're testing for existing user or not
          const requestUrl = global.__CURRENT_TEST_REQUEST__ || '';
          if (requestUrl.includes('signup') || requestUrl.includes('register')) {
            // For signup, return empty array (user doesn't exist)
            return Promise.resolve([]);
          } else {
            // For login, return user if email looks like a test email
            return Promise.resolve([mockUser]);
          }
        })
      })
    })
  }),
  insert: jest.fn().mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([mockUser])
    })
  }),
  update: jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([])
    })
  })
}));

export default {
  connectDatabase,
  getDatabase,
  closeDatabase,
};