import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger.js';
import { createApiError, ErrorType } from '../types/index.js';

export const validateSchema = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedBody = await schema.parseAsync(req.body);
      req.body = parsedBody;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        });
      }
      logger.error('Unexpected validation error:', error);
      next(createApiError(ErrorType.INTERNAL_SERVER_ERROR, 'An unexpected error occurred during validation'));
    }
  };
};
