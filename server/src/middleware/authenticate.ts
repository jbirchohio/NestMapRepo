import { Request, Response, NextFunction } from 'express.js';
import { verifyToken } from '../auth/services/jwtAuthService.js.js';
import { TokenType } from '../auth/jwt/types.js.js';

export function authenticate(
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
    
    // Verify the token
    const decoded = verifyToken(token, TokenType.ACCESS);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // Attach user to request object
    (req as any).user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId
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
