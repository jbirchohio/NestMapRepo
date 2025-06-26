import { AxiosError, AxiosResponse } from 'axios';
import { RequestConfig } from '../types';
import { ApiError } from '../utils/error';
/**
 * Error interceptor to handle API errors consistently
 */
export class ErrorInterceptor {
    /**
     * Response interceptor to transform successful responses
     */
    public onResponse = <T>(response: AxiosResponse): AxiosResponse => {
        // You can transform the response data here if needed
        return response;
    };
    /**
     * Response error interceptor to handle API errors
     */
    public onResponseError = async <T = any, D = any>(error: AxiosError<T, D>): Promise<never> => {
        const config = error.config as RequestConfig;
        // Skip error handling if explicitly requested
        if (config.skipErrorHandling) {
            return Promise.reject(error);
        }
        // Handle network errors
        if (!error.response) {
            const networkError = new ApiError(error.message || 'Network Error', {
                code: error.code || 'NETWORK_ERROR',
                config: error.config as RequestConfig,
                response: undefined
            });
            return Promise.reject(networkError);
        }
        const { status, data } = error.response as { status: number; data: T };
        const responseData = data as any;
        // Create a standardized error object
        const apiError = new ApiError(responseData?.message || error.message || 'An error occurred', {
            code: responseData?.code || error.code,
            statusCode: status,
            details: responseData?.details,
            config: error.config as RequestConfig,
            response: error.response?.data
        });
        // Handle specific error statuses
        switch (status) {
            case 400:
                // Bad Request
                console.error('Bad Request:', apiError);
                break;
            case 401:
                // Unauthorized - Handled by auth interceptor
                break;
            case 403:
                // Forbidden
                console.error('Forbidden:', apiError);
                break;
            case 404:
                // Not Found
                console.error('Not Found:', apiError);
                break;
            case 429:
                // Too Many Requests
                console.error('Rate Limited:', apiError);
                break;
            case 500:
                // Internal Server Error
                console.error('Server Error:', apiError);
                break;
            default:
                // Other errors
                console.error(`Error ${status}:`, apiError);
        }
        return Promise.reject(apiError);
    };
    /**
     * Request error interceptor
     */
    public onRequestError = (error: any): Promise<never> => {
        const config = error.config as RequestConfig;
        // Skip error handling if explicitly requested
        if (config?.skipErrorHandling) {
            return Promise.reject(error);
        }
        const apiError = new ApiError(error.message || 'Request Error', {
            code: error.code,
            config: error.config as RequestConfig
        });
        console.error('Request Error:', apiError);
        return Promise.reject(apiError);
    };
}
