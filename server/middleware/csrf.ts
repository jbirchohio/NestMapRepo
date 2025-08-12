import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

interface CSRFRequest extends Request {
  csrfToken?: () => string;
}

/**
 * Custom CSRF Protection Middleware
 * Uses double-submit cookie pattern for CSRF protection
 */
class CSRFProtection {
  private tokenName = 'csrf-token';
  private headerName = 'x-csrf-token';
  private cookieName = '_csrf';
  private saltLength = 8;
  private secretLength = 18;

  /**
   * Generate a new CSRF token
   */
  generateToken(): string {
    const salt = crypto.randomBytes(this.saltLength).toString('hex');
    const secret = crypto.randomBytes(this.secretLength).toString('hex');
    return salt + '.' + secret;
  }

  /**
   * Verify CSRF token
   */
  verifyToken(token: string, sessionToken: string): boolean {
    if (!token || !sessionToken) return false;
    
    // For double-submit cookie, tokens should match
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(sessionToken)
    );
  }

  /**
   * Middleware to set CSRF token
   */
  setToken() {
    return (req: CSRFRequest, res: Response, next: NextFunction) => {
      // Generate token if not exists
      let token = req.cookies?.[this.cookieName];
      
      if (!token) {
        token = this.generateToken();
        res.cookie(this.cookieName, token, {
          httpOnly: false, // Must be readable by JS for double-submit
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
      }

      // Add helper method to request
      req.csrfToken = () => token;
      
      // Add token to response locals for templates
      res.locals.csrfToken = token;
      
      next();
    };
  }

  /**
   * Middleware to verify CSRF token on state-changing requests
   */
  verifyRequest() {
    return (req: CSRFRequest, res: Response, next: NextFunction) => {
      // Skip CSRF check for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      // Skip for API routes that use different auth
      if (req.path.startsWith('/api/webhooks/')) {
        return next();
      }

      // Skip for public auth endpoints
      if (req.path === '/api/auth/login' || req.path === '/api/auth/register') {
        return next();
      }

      // Get token from cookie
      const cookieToken = req.cookies?.[this.cookieName];
      if (!cookieToken) {
        logger.warn('CSRF token missing from cookie', { 
          path: req.path,
          method: req.method,
          ip: req.ip 
        });
        return res.status(403).json({ message: 'CSRF token missing' });
      }

      // Get token from header or body
      const submittedToken = req.headers[this.headerName] as string ||
                            req.body?._csrf ||
                            req.query?._csrf as string;

      if (!submittedToken) {
        logger.warn('CSRF token missing from request', { 
          path: req.path,
          method: req.method,
          ip: req.ip 
        });
        return res.status(403).json({ message: 'CSRF token required' });
      }

      // Verify tokens match
      try {
        if (!this.verifyToken(submittedToken, cookieToken)) {
          logger.warn('CSRF token mismatch', { 
            path: req.path,
            method: req.method,
            ip: req.ip 
          });
          return res.status(403).json({ message: 'Invalid CSRF token' });
        }
      } catch (error) {
        logger.error('CSRF verification error', error);
        return res.status(403).json({ message: 'CSRF verification failed' });
      }

      next();
    };
  }

  /**
   * Get CSRF token endpoint
   */
  tokenEndpoint() {
    return (req: CSRFRequest, res: Response) => {
      const token = req.csrfToken?.() || '';
      res.json({ csrfToken: token });
    };
  }
}

export const csrf = new CSRFProtection();

// Export middleware functions
export const csrfSetToken = csrf.setToken();
export const csrfVerify = csrf.verifyRequest();