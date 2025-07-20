import { AxiosResponse } from 'axios';
import { jwtAuth } from '@/lib/jwtAuth';
import { SecurityHeaders, SanitizedError } from './types';

export class SecurityUtils {
  private static instance: SecurityUtils;
  private navigate?: () => void;

  private constructor(navigate?: () => void) {
    this.navigate = navigate;
  }

  public static getInstance(navigate?: () => void): SecurityUtils {
    if (!SecurityUtils.instance) {
      SecurityUtils.instance = new SecurityUtils(navigate);
    } else if (navigate && !SecurityUtils.instance.navigate) {
      // Update navigate function if a new one is provided and none was set before
      SecurityUtils.instance.navigate = navigate;
    }
    return SecurityUtils.instance;
  }

  // Add a method to check if instance is initialized
  public static isInitialized(): boolean {
    return !!SecurityUtils.instance;
  }

  // Add a method to safely get the instance or throw if not initialized
  public static getInstanceOrThrow(): SecurityUtils {
    if (!SecurityUtils.instance) {
      throw new Error('SecurityUtils has not been initialized. Call getInstance() first.');
    }
    return SecurityUtils.instance;
  }

  public getSecurityHeaders(): SecurityHeaders {
    return {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    };
  }

  public sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .replace(/[<>"'&]/g, (match) => {
        switch (match) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '"': return '&quot;';
          case "'": return '&#39;';
          case '&': return '&amp;';
          default: return match;
        }
      })
      .replace(/[\u0000-\u001F]/g, '')
      .replace(/[\u007F-\u009F]/g, '');
  }

  public sanitizeOutput(output: string): string {
    if (!output) return '';
    return output
      .replace(/[<>"'&]/g, (match) => {
        switch (match) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '"': return '&quot;';
          case "'": return '&#39;';
          case '&': return '&amp;';
          default: return match;
        }
      })
      .replace(/[\u0000-\u001F]/g, '')
      .replace(/[\u007F-\u009F]/g, '');
  }

  public sanitizeError(error: Error): SanitizedError {
    return {
      message: 'An error occurred',
      code: (error as any).code || 'UNKNOWN',
      type: error.name || 'Error'
    };
  }

  public sanitizeResponse<T>(response: AxiosResponse<T>): AxiosResponse<T> {
    if (response.data && typeof response.data === 'string') {
      response.data = this.sanitizeOutput(response.data) as unknown as T;
    }
    return response;
  }

  public async refreshSession(): Promise<boolean> {
    const token = jwtAuth.getToken();
    return !!token;
  }

  public async validateSession(): Promise<boolean> {
    const token = jwtAuth.getToken();
    return !!token;
  }

  public validateRequest(): boolean {
    try {
      // Validate session
      if (!this.validateSession()) {
        throw new Error('Session is invalid');
      }

      return true;
    } catch (error) {
      console.error('Request validation failed:', error);
      return false;
    }
  }

  public async performSecurityAudit(): Promise<{ success: boolean; details: string[] }> {
    const details: string[] = [];

    // Validate session
    if (!await this.validateSession()) {
      details.push('Invalid session');
    }

    // Validate security headers
    const headers = this.getSecurityHeaders();
    Object.entries(headers).forEach(([header, value]) => {
      if (!value) {
        details.push(`Missing header: ${header}`);
      }
    });

    return { success: details.length === 0, details };
  }

  public async getSessionDetails(): Promise<Record<string, any>> {
    const user = jwtAuth.getUser();
    const token = jwtAuth.getToken();
    return {
      userId: user?.id?.toString() || null,
      sessionId: token ? 'active' : null,
      ipAddress: null, // No longer tracking IP in client
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : null
    };
  }
  
  public reportSecurityContext(context: Record<string, any>): void {
    try {
      console.log('Security context report', context);
    } catch (error) {
      console.error('Failed to report security context', error);
    }
  }
}
