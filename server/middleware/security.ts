import { type Request as ExpressRequest, type Response, type NextFunction, type Application } from '../../express-augmentations.ts';
import { logger } from '../utils/logger.js';
// Define the user type that will be added to the request
export interface AuthUser {
    id: string;
    organizationId: string;
    role: string;
}
// Extend the Express Request type to include our custom user property
export interface AuthenticatedRequest {
    user?: AuthUser;
    token?: string;
    // Standard Express Request properties
    body: any;
    params: any;
    query: any;
    path: string;
    method: string;
    headers: any;
    get(name: string): string | undefined;
    [key: string]: any; // Allow any other properties
}
/**
 * SQL injection prevention middleware
 * Validates and sanitizes database queries
 */
export function preventSQLInjection(req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response {
    const sqlInjectionPatterns = [
        /(\%27|\')|(\-\-)|(\%23|#)/gi, // SQL comment sequences
        /((\%3D)|(=))[^\n]*(('|%27|\')|(\-\-)|(\%3B)|;)\)/i, // SQL injection with = and comments
        /\w*((\%27)|('|%27)|(\-\-)|(\%3B)|;)\s*((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i, // SQL injection with OR
        /((\%27|\%60|'|\s)+((\%6F|o|\%4F)(\%72|r|\%52)))+(\s|\%27|'|\%60)/i, // SQL injection with OR (variation)
    ];
    const checkForSQLInjection = (input: string): boolean => {
        if (!input)
            return false;
        return sqlInjectionPatterns.some((pattern) => pattern.test(input));
    };
    // Check query parameters
    if (req.query && Object.keys(req.query).length > 0) {
        const queryString = JSON.stringify(req.query).toLowerCase();
        if (checkForSQLInjection(queryString)) {
            logger.warn('Potential SQL injection attempt detected in query parameters');
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Suspicious input detected',
            });
        }
    }
    // Check request body
    if (req.body && Object.keys(req.body).length > 0) {
        const bodyString = JSON.stringify(req.body).toLowerCase();
        if (checkForSQLInjection(bodyString)) {
            logger.warn('Potential SQL injection attempt detected in request body');
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Suspicious input detected',
            });
        }
    }
    next();
}
/**
 * Organization security middleware
 * Ensures users can only access resources within their own organization
 */
export function enforceOrganizationSecurity(req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response {
    // Skip for public routes
    const publicRoutes = ['/health', '/auth'];
    if (publicRoutes.some((route) => req.path.startsWith(route))) {
        return next();
    }
    // Get organization ID from request
    const requestedOrgId = req.params.organizationId || req.body.organizationId || req.query.organizationId;
    const userOrgId = req.user?.organizationId;
    // Allow system admins to access any organization
    if (req.user?.role === 'admin') {
        return next();
    }
    // If no organization ID is being accessed, continue
    if (!requestedOrgId) {
        return next();
    }
    // Check if user is trying to access a different organization
    if (requestedOrgId !== userOrgId) {
        logger.warn(`User ${req.user?.id} attempted to access organization ${requestedOrgId} but belongs to ${userOrgId}`);
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Access to this organization is not allowed',
        });
    }
    next();
}
// Export the middleware functions
export default {
    preventSQLInjection,
    enforceOrganizationSecurity,
};
