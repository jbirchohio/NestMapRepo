import apiClient from '../apiClient'; // Default import
describe('ApiClient', () => {
    it('should be defined', () => {
        expect(apiClient).toBeDefined();
    });
    it('should have the correct base URL', () => {
        // The base URL should be set based on the environment
        expect(apiClient).toHaveProperty('client.defaults.baseURL');
        expect(apiClient.client.defaults.baseURL).toBeTruthy();
    });
    it('should have request and response interceptors', () => {
        // @ts-ignore - Accessing private property for test
        expect(apiClient.client.interceptors.request.handlers.length).toBeGreaterThan(0);
        // @ts-ignore - Accessing private property for test
        expect(apiClient.client.interceptors.response.handlers.length).toBeGreaterThan(0);
    });
});
