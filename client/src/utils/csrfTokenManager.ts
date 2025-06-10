import { SecureCookie } from './SecureCookie';
import { handleError } from './errorHandler';

export interface CSRFTokenConfig {
  expiryTime: number; // in milliseconds
  refreshInterval: number; // in milliseconds
}

export class CSRFTokenManager {
  private static instance: CSRFTokenManager;
  private csrfToken: string | null = null;
  private refreshTimeout: ReturnType<typeof setTimeout> | null = null;
  private config: CSRFTokenConfig;

  private constructor(config?: CSRFTokenConfig) {
    this.config = {
      expiryTime: 30 * 60 * 1000, // 30 minutes
      refreshInterval: 15 * 60 * 1000, // 15 minutes
      ...config
    };
    this.loadToken();
    this.startRefreshTimer();
  }

  public static getInstance(config?: CSRFTokenConfig): CSRFTokenManager {
    if (!CSRFTokenManager.instance) {
      CSRFTokenManager.instance = new CSRFTokenManager(config);
    }
    return CSRFTokenManager.instance;
  }

  private loadToken(): void {
    try {
      this.csrfToken = SecureCookie.get('csrf_token');
      if (this.csrfToken) {
        const decoded = JSON.parse(atob(this.csrfToken.split('.')[1]));
        if (Date.now() - decoded.timestamp > this.config.expiryTime) {
          this.csrfToken = null;
        }
      }
    } catch (error) {
      handleError(error);
      this.csrfToken = null;
    }
  }

  private createToken(): string {
    const timestamp = Date.now();
    const token = crypto.randomUUID();
    const encoded = btoa(JSON.stringify({ token, timestamp }));
    return `${token}.${encoded}`;
  }

  private startRefreshTimer(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    this.refreshTimeout = setTimeout(() => {
      this.refreshToken();
      this.startRefreshTimer();
    }, this.config.refreshInterval);
  }

  public async refreshToken(): Promise<void> {
    try {
      const newToken = this.createToken();
      SecureCookie.set('csrf_token', newToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: this.config.expiryTime / 1000
      });
      this.csrfToken = newToken;
    } catch (error) {
      handleError(error);
      throw new Error('Failed to refresh CSRF token');
    }
  }

  public getToken(): string | null {
    if (!this.csrfToken || this.isTokenExpired()) {
      return null;
    }
    return this.csrfToken;
  }

  public isTokenExpired(): boolean {
    if (!this.csrfToken) return true;
    try {
      const decoded = JSON.parse(atob(this.csrfToken.split('.')[1]));
      return Date.now() - decoded.timestamp > this.config.expiryTime;
    } catch {
      return true;
    }
  }

  public clearToken(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    this.csrfToken = null;
    SecureCookie.remove('csrf_token');
  }

  public getCSRFHeader(): { 'X-CSRF-Token': string } | null {
    const token = this.getToken();
    if (!token) return null;
    return { 'X-CSRF-Token': token };
  }
}
