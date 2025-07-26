import { Request, Response, NextFunction } from 'express';

export const notFound = (req: Request, res: Response, _next: NextFunction): void => {
  const message = `Route ${req.originalUrl} not found`;
  
  res.status(404).json({
    success: false,
    error: {
      message,
      statusCode: 404,
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  });
};

export default notFound;

