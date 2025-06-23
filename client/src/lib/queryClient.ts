import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { jwtAuth } from "./jwtAuth.ts";
async function throwIfResNotOk(res: Response) {
    if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
    }
}
export async function apiRequest(method: string, url: string, data?: unknown | undefined): Promise<any> {
    try {
        // Get JWT token
        const token = jwtAuth.getToken();
        const headers: Record<string, string> = {
            ...(data ? { "Content-Type": "application/json" } : {}),
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        };
        console.log(`Making ${method} request to ${url}`, data);
        const res = await fetch(url, {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined,
            credentials: "include",
        });
        console.log(`Response status: ${res.status}`);
        console.log(`Response headers:`, res.headers);
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`API Error: ${res.status} - ${errorText}`);
            let errorMessage;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorJson.error || 'Request failed';
            }
            catch {
                errorMessage = errorText || `HTTP ${res.status}`;
            }
            throw new Error(errorMessage);
        }
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const jsonResponse = await res.json();
            console.log(`JSON response:`, jsonResponse);
            return jsonResponse;
        }
        const textResponse = await res.text();
        console.log(`Text response:`, textResponse);
        return textResponse;
    }
    catch (error) {
        // Handle network errors, timeouts, and other fetch failures
        if (error instanceof TypeError && error.message.includes('fetch')) {
            console.error('Network error:', error);
            throw new Error('Network connection failed. Please check your internet connection.');
        }
        // Re-throw API errors as-is
        throw error;
    }
}
type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
    on401: UnauthorizedBehavior;
}) => QueryFunction<T> = ({ on401: unauthorizedBehavior }) => async ({ queryKey }) => {
    // Get JWT token
    const token = jwtAuth.getToken();
    const headers: Record<string, string> = {
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    };
    const res = await fetch(queryKey[0] as string, {
        headers,
        credentials: "include",
    });
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
    }
    await throwIfResNotOk(res);
    return await res.json();
};
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            queryFn: getQueryFn({ on401: "throw" }),
            refetchInterval: false,
            refetchOnWindowFocus: false,
            staleTime: Infinity,
            retry: false,
        },
        mutations: {
            retry: false,
        },
    },
});
