/**
 * API utility for making authenticated requests
 * Automatically includes credentials for cookie-based auth
 */

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private baseUrl = '/api';
  // CSRF removed - was causing authentication issues

  /**
   * Make an authenticated API request
   * Automatically includes credentials for cookie-based auth
   */
  async request<T = any>(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<T> {
    const { skipAuth, ...fetchOptions } = options;

    const config: RequestInit = {
      ...fetchOptions,
      credentials: skipAuth ? 'omit' : 'include', // Always include cookies unless explicitly skipped
      headers: {
        'Content-Type': 'application/json',
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