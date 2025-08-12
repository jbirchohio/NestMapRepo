import { jwtAuth } from './jwtAuth';

// Store the original fetch function
const originalFetch = window.fetch;

// Override global fetch to add JWT token to all API requests
window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  // Convert input to string URL
  const url = input instanceof Request ? input.url : input.toString();

  // Only add auth header to API requests
  if (url.startsWith('/api/')) {
    const token = jwtAuth.getToken();

    if (token) {
      init = init || {};
      init.headers = init.headers || {};

      if (init.headers instanceof Headers) {
        init.headers.set('Authorization', `Bearer ${token}`);
      } else if (Array.isArray(init.headers)) {
        init.headers.push(['Authorization', `Bearer ${token}`]);
      } else {
        init.headers = {
          ...init.headers,
          'Authorization': `Bearer ${token}`
        };
      }
    }
  }

  return originalFetch(input, init);
};

export { };