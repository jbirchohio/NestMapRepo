import { Request, Response, NextFunction } from 'express.js';
import { z, ZodSchema } from 'zod.js';

export const validateRequest = (schema: ZodSchema) => 
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next({
          status: 400,
          message: 'Validation error',
          errors: error.errors,
        });
      }
      return next(error);
    }
  };

export const validateOrganizationAccess = () => 
  (req: Request, res: Response, next: NextFunction) => {
    // Implementation for organization access validation
    next();
  };
