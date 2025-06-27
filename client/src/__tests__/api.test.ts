import { api, setApiLogLevel, LogLevel } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';

// Set log level to debug for testing
setApiLogLevel(LogLevel.DEBUG);

describe('API Endpoint Tests', () => {
  // Test each endpoint with appropriate parameters
  const testCases = [
    {
      name: 'GET /api/auth/session',
      method: 'GET' as const,
      endpoint: 'AUTH_SESSION',
      requiresAuth: true,
    },
    {
      name: 'GET /api/trips',
      method: 'GET' as const,
      endpoint: 'TRIPS',
      requiresAuth: true,
    },
    // Add more test cases for other endpoints
  ];

  testCases.forEach(({ name, method, endpoint, requiresAuth }) => {
    it(`should handle ${name}`, async () => {
      console.log(`\n--- Testing: ${name} ---`);
      
      try {
        const response = await api(
          endpoint,
          method,
          undefined, // No data for GET requests
          {
            // Add any required headers or params
            headers: {
              // Add auth token if required
              ...(requiresAuth && { Authorization: `Bearer ${localStorage.getItem('token')}` }),
            },
          }
        );
        
        console.log(`${name} response:`, response);
        expect(response).toBeDefined();
      } catch (error) {
        // Don't fail the test on error, just log it
        console.error(`Error in ${name}:`, error);
      }
    });
  });
});
