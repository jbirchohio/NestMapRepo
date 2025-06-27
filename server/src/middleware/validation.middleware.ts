import type { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { Logger } from '@nestjs/common';

type Constructor<T = any> = new (...args: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */[]) => T;

export function validateRequest<T extends object>(
  type: Constructor<T>,
  options: {
    skipMissingProperties?: boolean;
    whitelist?: boolean;
    forbidNonWhitelisted?: boolean;
    groups?: string[];
  } = {}
) {
  const logger = new Logger('ValidationMiddleware');
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const { body, params, query } = req;
      const data = { ...body, ...params, ...query };
      
      // Transform and validate the request data
      const object = plainToClass(type, data, {
        enableImplicitConversion: true,
        excludeExtraneousValues: true,
      });

      const errors = await validate(object, {
        skipMissingProperties: options.skipMissingProperties ?? false,
        whitelist: options.whitelist ?? true,
        forbidNonWhitelisted: options.forbidNonWhitelisted ?? true,
        groups: options.groups,
        validationError: { target: false },
      });

      if (errors.length > 0) {
        logger.warn(`Validation failed: ${JSON.stringify(errors)}`);
        
        // Format validation errors
        const formattedErrors = formatErrors(errors);
        
        return res.status(400).json({
          statusCode: 400,
          message: 'Validation failed',
          errors: formattedErrors,
        });
      }

      // Attach validated data to request object
      req.validatedData = object;
      next();
    } catch (error: unknown) {
      const err = error as Error;
      logger.error(`Validation middleware error: ${err.message}`, err.stack);
      next(error);
    }
  };
}

function formatErrors(errors: ValidationError[]): Record<string, string[]> {
  return errors.reduce((acc, error) => {
    if (error.constraints) {
      acc[error.property] = Object.values(error.constraints);
    }
    
    if (error.children && error.children.length > 0) {
      acc[error.property] = formatErrors(error.children);
    }
    
    return acc;
  }, {} as Record<string, any>);
}

// Extend Express Request type to include validatedData
declare global {
  namespace Express {
    interface Request {
      validatedData?: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
    }
  }
}
