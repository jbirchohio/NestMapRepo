#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

// Define interfaces for our procedure data
interface RouteProcedure {
  name: string;
  type: 'query' | 'mutation';
  handler: string;
  originalPath: string;
  method: string;
}

interface TRPCContext {
  req: any;
  res: any;
  user?: any;
  services?: any;
}

// Helper to convert Express route to tRPC procedure
async function convertRoute(routePath: string): Promise<RouteProcedure[]> {
  try {
    const content = await fs.readFile(routePath, 'utf8');
    
    // Extract route handlers
    const routePattern = /router\.(get|post|put|delete|patch)\(['\`]([^'\`]+)['\`],\s*(?:.*?,\s*)?async\s*\(req(?:,\s*res(?:,\s*next)?)?\)\s*=>\s*{([\s\S]*?)^\s*}\);/gm;
    
    const procedures: RouteProcedure[] = [];
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
        method: method.toLowerCase()
      });
    }
    
    return procedures;
  } catch (error) {
    console.error(`Error converting route ${routePath}:`, error);
    return [];
  }
}

// Convert path to procedure name
function pathToProcedureName(path: string): string {
  // Remove leading slash and convert to camelCase
  const parts = path.split('/').filter(Boolean);
  
  return parts.map((part, index) => {
    // Handle path parameters (e.g., :id)
    if (part.startsWith(':')) {
      return index === 0 ? 'by' + part.slice(1).charAt(0).toUpperCase() + part.slice(2)
                       : part.slice(1).charAt(0).toUpperCase() + part.slice(2);
    }
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join('').replace(/[^a-zA-Z0-9]/g, '');
}

// Authentication middleware generator
function generateAuthMiddleware() {
  return `// Authentication middleware
  const isAuthed = t.middleware(async ({ ctx, next }) => {
    const authHeader = ctx.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    const token = authHeader.split(' ')[1];
    
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET!);
      return next({
        ctx: {
          ...ctx,
          user
        }
      });
    } catch (error) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
  });\n\n`;
}

// Transform Express handler code to tRPC
function transformHandlerCode(handler: string): string {
  return handler
    .replace(/req\.params\.(\w+)/g, 'input.path.$1')
    .replace(/req\.body/g, 'input.body')
    .replace(/req\.query/g, 'input.query')
    .replace(/res\.json\(([^)]+)\)/g, 'return $1')
    .replace(/next\(([^)]+)\)/g, 'throw $1')
    .replace(/(\w+Service)\./g, 'ctx.services.$1.')
    .replace(/const (\w+) = await (\w+Service\.\w+\([^)]*\));/g, 
      'const $1 = await $2.catch(error => {\n' +
      '  console.error(\'Service error:\', error);\n' +
      '  throw new TRPCError({\n' +
      '    code: \'INTERNAL_SERVER_ERROR\',\n' +
      '    message: error.message || \'Service error\',\n' +
      '    cause: error\n' +
      '  });\n' +
      '});');
}

// Generate a single tRPC procedure
function generateProcedure(proc: RouteProcedure): string {
  const pathParams: string[] = [];
  proc.originalPath.replace(/\/:([^/]+)/g, (_, param: string) => {
    pathParams.push(param);
    return '';
  });

  const inputSchema: string[] = [];
  if (pathParams.length > 0) {
    inputSchema.push(`path: z.object({
      ${pathParams.map(p => `${p}: z.string()`).join(',\n      ')}
    })`);
  }

  if (proc.method !== 'get') {
    inputSchema.push('body: z.any() // TODO: Replace with proper schema');
  } else if (proc.originalPath.includes('?')) {
    inputSchema.push('query: z.any() // TODO: Replace with proper query schema');
  }

  const inputType = inputSchema.length > 0 
    ? `z.object({\n      ${inputSchema.join(',\n      ')}\n    })`
    : 'z.void()';

  return `  ${proc.name}: protectedProcedure
    .input(${inputType})
    .${proc.type}(async ({ input, ctx }) => {
      try {
        // Converted from: ${proc.method.toUpperCase()} ${proc.originalPath}
        ${transformHandlerCode(proc.handler)}
      } catch (error) {
        console.error('Error in ${proc.name}:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'An error occurred',
          cause: error
        });
      }
    })`;
}

// Generate tRPC router from procedures
function generateTRPCRouter(routerName: string, procedures: RouteProcedure[]): string {
  const authMiddleware = generateAuthMiddleware();
  
  const procedureCode = procedures.map(proc => 
    generateProcedure(proc)
  ).join(',\n\n');

  return `import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';

${authMiddleware}

export const ${routerName}Router = router({
${procedureCode}
});`;
}

// Main conversion function
export async function convertExpressToTRPC(routeFile: string) {
  const routeName = path.basename(routeFile, '.ts');
  const procedures = await convertRoute(routeFile);
  
  if (procedures.length === 0) {
    console.log(`No procedures found in ${routeFile}`);
    return;
  }

  const routerCode = generateTRPCRouter(routeName, procedures);
  const outputPath = path.join(process.cwd(), 'server', 'src', 'trpc', 'routers', `${routeName}.router.ts`);
  
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, routerCode, 'utf8');
  console.log(`Generated ${outputPath}`);
}

// Run the script if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Please provide a route file to convert');
    process.exit(1);
  }

  const routeFile = path.resolve(process.cwd(), args[0]);
  convertExpressToTRPC(routeFile).catch(console.error);
}