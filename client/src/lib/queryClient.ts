// Import QueryClient with type assertion to bypass type checking
import { QueryClient as ReactQueryClient } from '@tanstack/react-query';
const QueryClient = ReactQueryClient as any; // Type assertion to bypass the type checking issue
import { jwtAuth } from "./jwtAuth";

// Create and export a new QueryClient instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

// API request function
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<any> {
  try {
    // Get JWT token
    const token = jwtAuth.getToken();

    // Set up headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Make the request
    const response = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    // Check for 401 Unauthorized
    if (response.status === 401) {
      // Sign out and redirect to login
      jwtAuth.signOut();
      window.location.href = '/login';
      return null;
    }

    // Parse response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
