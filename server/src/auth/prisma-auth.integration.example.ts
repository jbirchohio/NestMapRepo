/**
 * Example: Prisma Auth Integration with Express
 * 
 * This file demonstrates how to integrate the new Prisma authentication system
 * into an Express application. Use this as a reference when updating your routes.
 */

import express, { Request, Response, NextFunction } from 'express';
import { prismaService } from './common/database';
import { prismaAuthAdapter } from './prisma-auth.adapter';
import { prismaAuthService } from './services/prisma-auth.service';

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());

/**
 * Public Routes
 */
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    const result = await prismaAuthService.register({
      email,
      password,
      firstName,
      lastName,
    });
    
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip;
    const userAgent = req.get('User-Agent') || '';
    
    const result = await prismaAuthService.login(
      { email, password },
      ip,
      userAgent
    );
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials',
    });
  }
});

/**
 * Protected Routes
 */

// Get current user profile
app.get(
  '/api/auth/me',
  prismaAuthAdapter.authenticate(),
  prismaAuthAdapter.requireAuth(),
  async (req: Request, res: Response) => {
    try {
      // User is attached to request by the authenticate middleware
      const user = req.user;
      
      // Get fresh user data from the database
      const userData = await prismaService.users.findById(user!.id);
      
      if (!userData) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
      
      res.json({
        success: true,
        data: userData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile',
      });
    }
  }
);

// Admin-only route example
app.get(
  '/api/admin/users',
  prismaAuthAdapter.authenticate(),
  prismaAuthAdapter.requireAdmin(),
  async (req: Request, res: Response) => {
    try {
      // Only accessible by admins
      const users = await prismaService.users.findMany();
      
      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
      });
    }
  }
);

// Resource ownership example
app.get(
  '/api/users/:userId/profile',
  prismaAuthAdapter.authenticate(),
  // Only allow the user to access their own profile or admins
  prismaAuthAdapter.requireResourceOwnership(
    async (req) => req.params.userId
  ),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const user = await prismaService.users.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }
      
      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile',
      });
    }
  }
);

// Organization context example
app.get(
  '/api/organization/data',
  prismaAuthAdapter.authenticate(),
  prismaAuthAdapter.requireOrgContext(),
  async (req: Request, res: Response) => {
    try {
      // Organization ID is available in req.user.organizationId
      const organizationId = req.user?.organizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'Organization context is required',
        });
      }
      
      // Fetch organization data
      // const orgData = await prismaService.organizations.findById(organizationId);
      
      res.json({
        success: true,
        data: {
          organizationId,
          // Add organization data here
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch organization data',
      });
    }
  }
);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize database connection
    await prismaService.connect();
    
    // Initialize authentication
    await prismaAuthAdapter.initialize();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await prismaService.disconnect();
  process.exit(0);
});

// Start the server
startServer();

export default app;
