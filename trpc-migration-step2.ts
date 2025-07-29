#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper function to ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
  }
}

// Helper function to write file
async function writeFile(filePath, content) {
  try {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`✅ Created: ${filePath}`);
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
  }
}

// Step 2.1: Create context and router infrastructure
async function createTRPCInfrastructure() {
  console.log('\n📁 Creating tRPC infrastructure...');

  // Create context.ts
  const contextContent = `import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../auth/auth.service';

export async function createContext({ req, res }: CreateExpressContextOptions) {
  // Get the session from the request
  let user = null;
  
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      user = await verifyToken(token);
    } catch (error) {
      // Invalid token, continue without user
    }
  }

  return {
    req,
    res,
    user,
    prisma,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
`;

  await writeFile('server/src/trpc/context.ts', contextContent);

  // Create base router
  const routerContent = `import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import superjson from 'superjson';
import { ZodError } from 'zod';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware to check if user is authenticated
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// Helper for creating routers
export const createRouter = () => t.router;
export { t };
`;

  await writeFile('server/src/trpc/trpc.ts', routerContent);

  // Create main router index
  const mainRouterContent = `import { router } from './trpc';
import { authRouter } from './routers/auth';
import { userRouter } from './routers/user';
import { tripsRouter } from './routers/trips';
import { bookingsRouter } from './routers/bookings';
import { expensesRouter } from './routers/expenses';
import { analyticsRouter } from './routers/analytics';
import { adminRouter } from './routers/admin';
import { organizationsRouter } from './routers/organizations';
import { notificationsRouter } from './routers/notifications';
import { aiRouter } from './routers/ai';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  trips: tripsRouter,
  bookings: bookingsRouter,
  expenses: expensesRouter,
  analytics: analyticsRouter,
  admin: adminRouter,
  organizations: organizationsRouter,
  notifications: notificationsRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
`;

  await writeFile('server/src/trpc/routers/index.ts', mainRouterContent);
}

// Step 2.2: Update app.ts to integrate tRPC
async function updateAppFile() {
  console.log('\n📝 Updating app.ts to integrate tRPC...');

  const appUpdateContent = `// Add this import at the top of app.ts
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './trpc/routers';
import { createContext } from './trpc/context';

// Add this after other middleware setup but before error handlers
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ path, error }) => {
      console.error(\`tRPC error on \${path}:\`, error);
    },
  })
);
`;

  console.log('⚠️  Manual update required for app.ts:');
  console.log(appUpdateContent);
}

// Step 2.3: Convert sample routes to tRPC routers
async function createSampleRouters() {
  console.log('\n🔄 Creating sample tRPC routers...');

  // Auth router
  const authRouterContent = `import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['USER', 'ADMIN', 'CORPORATE_ADMIN']).optional(),
});

export const authRouter = router({
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;
      
      const user = await ctx.prisma.user.findUnique({
        where: { email },
      });

      if (!user || !await bcrypt.compare(password, user.password)) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      };
    }),

  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password, name, role } = input;

      const existingUser = await ctx.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User already exists',
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await ctx.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: role || 'USER',
        },
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      };
    }),

  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      // In a real app, you might want to invalidate the token here
      return { success: true };
    }),

  me: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),
});
`;

  await writeFile('server/src/trpc/routers/auth.ts', authRouterContent);

  // User router
  const userRouterContent = `import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
});

export const userRouter = router({
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.userId },
        include: {
          organization: true,
          preferences: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),

  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      const updated = await ctx.prisma.user.update({
        where: { id: ctx.user.userId },
        data: input,
      });

      return updated;
    }),

  getPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const preferences = await ctx.prisma.userPreferences.findUnique({
        where: { userId: ctx.user.userId },
      });

      return preferences || {
        notifications: true,
        emailUpdates: true,
        theme: 'light',
      };
    }),

  updatePreferences: protectedProcedure
    .input(z.object({
      notifications: z.boolean().optional(),
      emailUpdates: z.boolean().optional(),
      theme: z.enum(['light', 'dark']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const preferences = await ctx.prisma.userPreferences.upsert({
        where: { userId: ctx.user.userId },
        update: input,
        create: {
          userId: ctx.user.userId,
          ...input,
        },
      });

      return preferences;
    }),
});
`;

  await writeFile('server/src/trpc/routers/user.ts', userRouterContent);

  // Trips router
  const tripsRouterContent = `import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

const createTripSchema = z.object({
  name: z.string().min(1),
  destination: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  budget: z.number().positive().optional(),
  description: z.string().optional(),
});

export const tripsRouter = router({
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
      cursor: z.string().optional(),
      status: z.enum(['DRAFT', 'PLANNED', 'ACTIVE', 'COMPLETED']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { limit, cursor, status } = input;

      const trips = await ctx.prisma.trip.findMany({
        where: {
          userId: ctx.user.userId,
          ...(status && { status }),
        },
        take: limit + 1,
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1,
        }),
        orderBy: { createdAt: 'desc' },
        include: {
          bookings: true,
          expenses: true,
        },
      });

      let nextCursor: string | undefined = undefined;
      if (trips.length > limit) {
        const nextItem = trips.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items: trips,
        nextCursor,
      };
    }),

  getById: protectedProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      const trip = await ctx.prisma.trip.findFirst({
        where: {
          id: input,
          userId: ctx.user.userId,
        },
        include: {
          bookings: true,
          expenses: true,
          activities: true,
        },
      });

      if (!trip) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Trip not found',
        });
      }

      return trip;
    }),

  create: protectedProcedure
    .input(createTripSchema)
    .mutation(async ({ input, ctx }) => {
      const trip = await ctx.prisma.trip.create({
        data: {
          ...input,
          userId: ctx.user.userId,
          status: 'DRAFT',
        },
      });

      return trip;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: createTripSchema.partial(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;

      const existing = await ctx.prisma.trip.findFirst({
        where: { id, userId: ctx.user.userId },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Trip not found',
        });
      }

      const updated = await ctx.prisma.trip.update({
        where: { id },
        data,
      });

      return updated;
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.prisma.trip.findFirst({
        where: { id: input, userId: ctx.user.userId },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Trip not found',
        });
      }

      await ctx.prisma.trip.delete({
        where: { id: input },
      });

      return { success: true };
    }),
});
`;

  await writeFile('server/src/trpc/routers/trips.ts', tripsRouterContent);

  // Create placeholder routers
  const placeholderRouters = [
    'bookings',
    'expenses',
    'analytics',
    'admin',
    'organizations',
    'notifications',
    'ai'
  ];

  for (const routerName of placeholderRouters) {
    const content = `import { router, protectedProcedure } from '../trpc';

export const ${routerName}Router = router({
  // TODO: Implement ${routerName} procedures
  placeholder: protectedProcedure
    .query(async () => {
      return { message: '${routerName} router to be implemented' };
    }),
});
`;
    await writeFile(`server/src/trpc/routers/${routerName}.ts`, content);
  }
}

// Route conversion helper
async function generateRouteConverter() {
  console.log('\n🔧 Creating route conversion helper script...');

  const converterContent = `#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

// Helper to convert Express route to tRPC procedure
async function convertRoute(routePath) {
  try {
    const content = await fs.readFile(routePath, 'utf8');
    
    // Extract route handlers
    const routePattern = /router\\.(get|post|put|delete|patch)\\(['"\`]([^'"\`]+)['"\`],\\s*(?:.*?,\\s*)?async\\s*\\(req,\\s*res(?:,\\s*next)?\\)\\s*=>\\s*{([\\s\\S]*?)^\\s*}\\);/gm;
    
    const procedures = [];
    let match;
    
    while ((match = routePattern.exec(content)) !== null) {
      const [, method, path, handler] = match;
      const procedureName = pathToProcedureName(path);
      const procedureType = method === 'get' ? 'query' : 'mutation';
      
      procedures.push({
        name: procedureName,
        type: procedureType,
        handler: handler.trim(),
        originalPath: path,
      });
    }
    
    return procedures;
  } catch (error) {
    console.error(\`Error converting route \${routePath}:\`, error);
    return [];
  }
}

// Convert path to procedure name
function pathToProcedureName(path) {
  // Remove leading slash and convert to camelCase
  const parts = path.split('/').filter(Boolean);
  
  return parts
    .map((part, index) => {
      // Remove :param syntax
      part = part.replace(/^:/, '');
      
      // Convert to camelCase
      if (index === 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

// Generate tRPC router from procedures
function generateTRPCRouter(routerName, procedures) {
  const imports = \`import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
\`;

  const procedureCode = procedures.map(proc => {
    // Basic conversion - this needs manual refinement
    return \`  \${proc.name}: protectedProcedure
    .\${proc.type}(async ({ ctx }) => {
      // TODO: Convert from Express handler
      // Original path: \${proc.originalPath}
      \${proc.handler.replace(/req\\./g, 'ctx.req.').replace(/res\\./g, '// res.')}
    }),\`;
  }).join('\\n\\n');

  return \`\${imports}

export const \${routerName}Router = router({
\${procedureCode}
});
\`;
}

// Main conversion function
async function convertExpressToTRPC(routeFile) {
  const routeName = path.basename(routeFile, '.ts');
  const procedures = await convertRoute(routeFile);
  
  if (procedures.length === 0) {
    console.log(\`No routes found in \${routeFile}\`);
    return;
  }
  
  const routerCode = generateTRPCRouter(routeName, procedures);
  const outputPath = path.join('server/src/trpc/routers', \`\${routeName}.ts\`);
  
  await fs.writeFile(outputPath, routerCode);
  console.log(\`✅ Converted \${routeFile} to \${outputPath}\`);
}

// Run converter on all route files
async function convertAllRoutes() {
  const routesDir = 'server/src/routes';
  const files = await fs.readdir(routesDir);
  
  for (const file of files) {
    if (file.endsWith('.ts') && file !== 'index.ts') {
      await convertExpressToTRPC(path.join(routesDir, file));
    }
  }
}

// Run if called directly
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  convertAllRoutes().catch(console.error);
}
`;

  await writeFile('scripts/convert-routes-to-trpc.js', converterContent);
  console.log('✅ Route converter script created');
}

// Main execution
async function main() {
  console.log('🚀 Starting tRPC migration - Step 2: Server-side setup\n');

  try {
    // Step 2.1
    await createTRPCInfrastructure();
    
    // Step 2.2
    await updateAppFile();
    
    // Step 2.3
    await createSampleRouters();
    
    // Create route converter
    await generateRouteConverter();

    console.log('\n✨ Step 2 completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Manually update server/src/app.ts with the tRPC middleware');
    console.log('2. Run the route converter: node scripts/convert-routes-to-trpc.js');
    console.log('3. Review and refine the generated routers');
    console.log('4. Delete old route files after verification');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run the script
main();
