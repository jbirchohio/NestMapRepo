import { Request, Response, NextFunction } from 'express';

interface TestRequest extends Request {
  user?: { id: string };
  organizationId?: string;
  params?: Record<string, string>;
  body?: Record<string, any>;
}

function testMiddleware(req: TestRequest, res: Response, next: NextFunction) {
  console.log('Test middleware works');
  const orgId = req.params?.organizationId || req.body?.organizationId;
  console.log('Organization ID:', orgId);
  next();
}

export { testMiddleware };