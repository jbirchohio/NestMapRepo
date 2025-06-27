import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/jwt/index.js';
import type { AccessTokenPayload } from '@shared/src/types/auth/jwt.js';


export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
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
        const result = await verifyToken<AccessTokenPayload>(token, 'access');
        if (!result.valid || !result.payload) {
            return res.status(401).json({
                error: result.error || 'Invalid or expired token',
                code: result.code || 'INVALID_TOKEN'
            });
        }
        
        // Extract payload
        const payload = result.payload;
        
        // Attach user to request object
        (req as any).user = {
            id: payload.sub, // sub contains the user ID
            email: payload.email,
            role: payload.role,
            organizationId: payload.organization_id
        };
        next();
    }
    catch (error) {
        return res.status(401).json({
            error: 'Authentication failed',
            code: 'AUTH_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
export default authenticate;
