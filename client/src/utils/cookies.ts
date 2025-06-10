interface CookieOptions {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export const SecureCookie = {
  get(name: string): string | null {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift();
      return cookieValue || null;
    }
    return null;
  },
  
  set(
    name: string, 
    value: string, 
    options: CookieOptions = {}
  ): void {
    if (typeof document === 'undefined') return;
    
    let cookieString = `${name}=${value}`;
    
    if (options.path) cookieString += `; path=${options.path}`;
    if (options.domain) cookieString += `; domain=${options.domain}`;
    if (options.maxAge) cookieString += `; max-age=${options.maxAge}`;
    if (options.expires) cookieString += `; expires=${options.expires.toUTCString()}`;
    if (options.secure) cookieString += '; secure';
    if (options.httpOnly) cookieString += '; HttpOnly';
    if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;
    
    document.cookie = cookieString;
  },
  
  remove(name: string, options: Omit<CookieOptions, 'maxAge' | 'expires'> = {}): void {
    if (typeof document === 'undefined') return;
    
    document.cookie = `${name}=; max-age=0${options.path ? `; path=${options.path}` : ''}${
      options.domain ? `; domain=${options.domain}` : ''
    }${options.secure ? '; secure' : ''}${options.sameSite ? `; SameSite=${options.sameSite}` : ''}`;
  }
};
