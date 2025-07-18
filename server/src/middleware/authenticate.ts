import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/services/jwtAuthService';
import { TokenPayload } from '../auth/jwt/types';

// The Express Request type is already extended in express.d.ts

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        code: 'NO_TOKEN_PROVIDED'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token - must await since it returns a Promise
    const verificationResult = await verifyToken(token, 'access');
    
    if (!verificationResult.valid || !verificationResult.payload) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        message: verificationResult.error
      });
    }

    const payload = verificationResult.payload as TokenPayload;

    // Attach user to request object
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default authenticate;
