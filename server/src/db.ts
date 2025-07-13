// Mock database connection
export const db = {
  query: {
    users: {
      findFirst: async (where: any) => ({
        id: 'mock-user-id',
        email: 'mock@example.com',
        password_hash: 'mock-hash',
        role: 'user',
        organization_id: 'mock-org-id',
        firstName: 'Mock',
        lastName: 'User',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      })
    }
  },
  update: (table: any) => ({
    set: (data: any) => ({
      where: (condition: any) => Promise.resolve()
    })
  }),
  select: () => ({
    from: (table: any) => ({
      where: (condition: any) => Promise.resolve([{
        id: 'mock-user-id',
        email: 'mock@example.com',
        role: 'user',
        organization_id: 'mock-org-id',
        firstName: 'Mock',
        lastName: 'User',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }])
    })
  })
};