// Export all database-related functionality
export * from './prisma.service';

// Export types and interfaces
export * from '@prisma/client';

// Initialize and export the Prisma service
import { prismaService } from './prisma.service';

export const initializeDatabase = async (): Promise<void> => {
  try {
    await prismaService.connect();
    console.log('✅ Database connection established');
    
    // Perform any additional database initialization here
    
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
    process.exit(1);
  }
};

export const shutdownDatabase = async (): Promise<void> => {
  try {
    await prismaService.disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};

// Re-export commonly used repositories for convenience
export { PrismaUserRepository } from '../repositories/prisma/user.prisma.repository';
export { PrismaRefreshTokenRepository } from '../repositories/prisma/refresh-token.prisma.repository';
