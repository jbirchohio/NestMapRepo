import type { Request, Response, NextFunction } from 'express';
import type { AnyZodObject } from 'zod';
import { z } from 'zod';
// TODO: Implement actual validation logic
export const validateRequest = (schema: AnyZodObject): ((req: Request, res: Response, next: NextFunction) => void | Response) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: error.errors,
                });
            }
            // TODO: verify behavior - Handle other unexpected errors
            console.error('Unexpected error during validation:', error);
            res.status(500).json({ message: 'Internal server error during validation' });
            return; // Explicitly end path
        }
    };
};
