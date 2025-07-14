import { parse, serialize } from 'cookie';
import { getCookie, setCookie, removeCookie } from 'react-use-cookie';

interface CookieOptions {
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
}

export class SecureCookie {
  private static readonly DEFAULT_OPTIONS: CookieOptions = {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
  };

  static set(name: string, value: string, options: CookieOptions = {}): void {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
    setCookie(name, value, finalOptions);
  }

  static get(name: string): string | null {
    return getCookie(name);
  }

  static remove(name: string): void {
    removeCookie(name);
  }

  static getAll(): Record<string, string> {
    const cookies = document.cookie;
    const parsed = parse(cookies);
    const filtered: Record<string, string> = {};
    Object.keys(parsed).forEach((key) => {
      if (typeof parsed[key] === 'string') {
        filtered[key] = parsed[key] as string;
      }
    });
    return filtered;
  }

  static clearAll(): void {
    const cookies = this.getAll();
    Object.keys(cookies).forEach((name) => this.remove(name));
  }

  /**
   * Serialize a cookie for server-side usage
   */
  static serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
    return serialize(name, value, finalOptions);
  }

  static setAccessToken(token: string, options?: CookieOptions): void {
    this.set('access_token', token, options);
  }

  static getAccessToken(): string | null {
    return this.get('access_token');
  }

  static setRefreshToken(token: string, options?: CookieOptions): void {
    this.set('refresh_token', token, options);
  }

  static getRefreshToken(): string | null {
    return this.get('refresh_token');
  }

  static clearTokens(): void {
    this.remove('access_token');
    this.remove('refresh_token');
  }
}
