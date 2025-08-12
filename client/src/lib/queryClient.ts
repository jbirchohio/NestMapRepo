import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { jwtAuth } from "./jwtAuth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`Request failed: ${text}`);
  }
}

const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  const [baseUrl, ...params] = queryKey as string[];
  
  let url = baseUrl;
  if (params.length > 0) {
    url = `${baseUrl}/${params.join('/')}`;
  }
  
  const token = jwtAuth.getToken();
  
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      }
    });
    
    throwIfResNotOk(res);
    return res.json();
  } catch (error) {
    // If it's a network error or something else, try to extract a meaningful message
    let errorMessage = 'An error occurred';
    
    if (error instanceof Error) {
      const errorText = error.message;
      // Try to parse the error message if it's JSON
      try {
        const errorData = JSON.parse(errorText.replace('Request failed: ', ''));
        errorMessage = errorData.message || errorData.error || errorText;
      } catch {
        errorMessage = errorText || 'Network error';
      }
    }
    
    throw new Error(errorMessage);
  }
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on 401 or 403
        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('403')) {
            return false;
          }
        }
        return failureCount < 2;
      },
    },
  },
});

// Export the default query function for use in components
export const getQueryFn = defaultQueryFn;

// Export an API request function for manual requests
export async function apiRequest(method: string, url: string, data?: any) {
  const token = jwtAuth.getToken();
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const res = await fetch(url, options);
  throwIfResNotOk(res);
  
  const text = await res.text();
  if (!text) return null;
  
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}