/**
 * API utility for making authenticated requests
 * Automatically includes credentials for cookie-based auth
 */

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private baseUrl = '/api';
  private csrfToken: string | null = null;
  private csrfPromise: Promise<string> | null = null;

  /**
   * Get CSRF token (cached)
   */
  private async getCsrfToken(): Promise<string> {
    // Return cached token if available
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // Return existing promise if fetching
    if (this.csrfPromise) {
      return this.csrfPromise;
    }

    // Fetch new token
    this.csrfPromise = fetch('/api/auth/csrf-token', {
      method: 'GET',
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        this.csrfToken = data.csrfToken;
        this.csrfPromise = null;
        return this.csrfToken;
      })
      .catch(error => {
        this.csrfPromise = null;
        throw error;
      });

    return this.csrfPromise;
  }

  /**
   * Make an authenticated API request
   * Automatically includes credentials for cookie-based auth and CSRF token
   */
  async request<T = any>(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    // Get CSRF token for state-changing requests
    let csrfToken: string | undefined;
    if (!skipAuth && fetchOptions.method && !['GET', 'HEAD'].includes(fetchOptions.method)) {
      try {
        csrfToken = await this.getCsrfToken();
      } catch (error) {
        // Continue without CSRF token for public endpoints
      }
    }

    const config: RequestInit = {
      ...fetchOptions,
      credentials: skipAuth ? 'omit' : 'include', // Always include cookies unless explicitly skipped
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        ...fetchOptions.headers,
      },
    };

    // Remove Content-Type for FormData
    if (fetchOptions.body instanceof FormData) {
      delete (config.headers as any)['Content-Type'];
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, config);

    if (!response.ok) {
      // If CSRF token is invalid, clear it and retry once
      if (response.status === 403) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        if (error.message?.includes('CSRF')) {
          this.csrfToken = null;
          // Retry the request once with a fresh token
          if (!options.retried) {
            return this.request(endpoint, { ...options, retried: true });
          }
        }
      }
      
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    return response.json();
  }

  // Convenience methods
  async get<T = any>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async patch<T = any>(endpoint: string, data?: any, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const api = new ApiClient();

// Legacy support for direct fetch with auth headers
export function getAuthHeaders(): HeadersInit {
  // With httpOnly cookies, we don't need to send auth headers
  // The cookie is automatically included with credentials: 'include'
  return {
    'Content-Type': 'application/json',
  };
}

// Helper to check if user is authenticated (for components that need to know)
export async function checkAuth(): Promise<boolean> {
  try {
    await api.get('/auth/user');
    return true;
  } catch {
    return false;
  }
}