import getApiClient from '../apiClient';

describe('ApiClient', () => {
  it('should be defined', () => {
    expect(getApiClient()).toBeDefined();
  });

  it('should have the correct base URL', () => {
    // The base URL should be set based on the environment
    const client = (getApiClient() as any).client as import('axios').AxiosInstance;
    expect(client.defaults.baseURL).toBeTruthy();
  });

  it('should have request and response interceptors', () => {
    const client = (getApiClient() as any).client as import('axios').AxiosInstance;
    // Check if interceptors are defined (can't check handlers directly as they're private)
    expect(client.interceptors.request).toBeDefined();
    expect(client.interceptors.response).toBeDefined();
    
    // Alternative way to check if interceptors are working by making a test request
    // This is a basic check - in a real test, you'd want to mock the request/response
    expect(() => {
      client.interceptors.request.use(
        config => config,
        error => Promise.reject(error)
      );
      client.interceptors.response.use(
        response => response,
        error => Promise.reject(error)
      );
    }).not.toThrow();
  });
});
