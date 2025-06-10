# NestMap API Client (v2)

A robust, type-safe HTTP client for interacting with the NestMap API. Built on top of Axios with enhanced TypeScript support, request deduplication, caching, retry logic, and comprehensive error handling.

## ✨ Features

### Core Features
- **Type Safety**: Full TypeScript support with generics for request/response typing
- **Authentication**: Automatic JWT token handling with refresh token support
- **Performance**:
  - Request deduplication
  - Response caching with TTL
  - Request cancellation
  - Automatic retry with exponential backoff

### Advanced Features
- **Error Handling**:
  - Structured error responses
  - Network error detection
  - Rate limiting handling
  - Server/Client error differentiation
- **Request Features**:
  - File upload with progress tracking
  - Pagination support
  - Concurrent request handling
  - Request/Response interceptors
  - Custom cache control

### Developer Experience
- **Modular Architecture**:
  - Separated concerns (auth, error handling, retry logic)
  - Extensible interceptors
  - Customizable configuration
- **Debugging**:
  - Detailed error messages
  - Request/Response logging
  - Cache statistics

## 🚀 Installation

The API client is included in the project. Required peer dependencies:

```bash
yarn add axios
```

## 🔧 Configuration

### Environment Variables

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_ENV=development
```

### Initialization

Import the v2 API client:

```typescript
import { apiClientV2 } from '@/services/api/apiClientV2';
```

### Basic Setup

```typescript
// Configure default settings
apiClientV2.setDefaultConfig({
  useCache: true,      // Enable response caching
  dedupe: true,        // Enable request deduplication
  retry: 3,            // Number of retry attempts
  retryDelay: 1000,    // Initial retry delay in ms
});

// Set auth token (if available)
apiClientV2.setAuthToken('your-jwt-token');
```

## 📡 Basic Usage

### Making Requests

#### GET Request

```typescript
// Basic GET with type safety
const user = await apiClient.get<User>('/users/123');

// With query parameters and request config
const posts = await apiClient.get<Post[]>('/posts', {
  params: { status: 'published' },
  useCache: true, // Enable response caching
  cacheTTL: 60000 // Cache for 1 minute
});
```

#### POST Request

```typescript
// Create a new resource
const newUser = await apiClient.post<User, CreateUserDTO>('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// With custom headers
await apiClient.post('/endpoint', data, {
  headers: { 'X-Custom-Header': 'value' }
});
```

#### File Upload

```typescript
// Upload a file with progress tracking
const result = await apiClient.upload<FileUploadResponse>(
  '/upload',
  file,
  'file',
  { userId: 123 },
  (progress) => {
    console.log(`Upload Progress: ${progress}%`);
  }
);
```

## 🔄 Advanced Usage

### Request Deduplication

The client automatically deduplicates identical requests made in parallel:

```typescript
// These two identical requests will be deduplicated
const request1 = apiClient.get('/users/123');
const request2 = apiClient.get('/users/123');

// Both promises will resolve with the same response
const [user1, user2] = await Promise.all([request1, request2]);
```

### Response Caching

Cache responses to improve performance:

```typescript
// Enable caching for this request
const user = await apiClient.get<User>('/users/123', {
  useCache: true,          // Enable caching
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  cacheKey: 'user-123'     // Optional custom cache key
});

// Clear cache when needed
apiClient.clearCache('user-123'); // Clear specific cache
apiClient.clearCache();           // Clear all cache
```

### Request Cancellation

Cancel in-flight requests when needed:

```typescript
// Create a cancel token source
const source = apiClient.cancelTokenSource();

// Make a request with cancellation
const request = apiClient.get('/slow-endpoint', {
  cancelToken: source.token
});

// Cancel the request
source.cancel('Operation canceled by user');

try {
  await request;
} catch (error) {
  if (apiClient.isCancel(error)) {
    console.log('Request canceled:', error.message);
  }
}
```

### Error Handling

Consistent error handling with TypeScript types:

```typescript
try {
  await apiClient.get('/protected-route');
} catch (error) {
  if (apiClient.isApiError(error)) {
    // Type-safe access to error properties
    console.error('API Error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      code: error.response?.data?.code
    });
    
    // Handle specific error codes
    if (error.response?.status === 401) {
      // Handle unauthorized (e.g., redirect to login)
    }
  } else {
    // Handle network or other errors
    console.error('Request failed:', error.message);
  }
}
```

## 🛠 API Reference

### Core Methods

#### `get<T>(url: string, config?: RequestConfig): Promise<T>`
Make a GET request.

#### `post<T, D = any>(url: string, data?: D, config?: RequestConfig): Promise<T>`
Make a POST request.

#### `put<T, D = any>(url: string, data?: D, config?: RequestConfig): Promise<T>`
Make a PUT request.

#### `patch<T, D = any>(url: string, data?: D, config?: RequestConfig): Promise<T>`
Make a PATCH request.

#### `delete<T>(url: string, config?: RequestConfig): Promise<T>`
Make a DELETE request.

#### `upload<T>(url: string, file: File, fieldName?: string, data?: any, onProgress?: (progress: number) => void, config?: RequestConfig): Promise<T>`
Upload a file with progress tracking.

### Utility Methods

#### `cancelTokenSource()`
Create a new cancel token source.

#### `isCancel(error: any): boolean`
Check if an error is a cancellation.

#### `isApiError(error: any): error is AxiosError<ApiErrorResponse>`
Type guard for API errors.

#### `clearCache(key?: string): void`
Clear cached responses.

#### `getCacheStats(): { size: number; keys: string[] }`
Get cache statistics.

## 🚨 Error Handling

The API client provides consistent error handling with the following error types:

- **Network Errors**: When the request fails to reach the server
- **API Errors**: When the server responds with an error status code (4xx, 5xx)
- **Cancellation Errors**: When a request is cancelled

### Error Response Format

```typescript
interface ApiErrorResponse {
  message: string;      // Human-readable error message
  code?: string;        // Error code (e.g., 'VALIDATION_ERROR')
  statusCode: number;  // HTTP status code
  details?: {           // Additional error details
    [key: string]: any;
  };
}
```

## 🔒 Authentication

The client automatically handles JWT authentication by:

1. Adding the `Authorization` header to all requests
2. Refreshing expired access tokens when a 401 is received
3. Queuing requests during token refresh

### Manual Token Management

```typescript
// Set auth token manually
apiClient.setAuthToken('your-jwt-token');

// Clear auth token
apiClient.clearAuthToken();

// Check if user is authenticated
const isAuthenticated = apiClient.isAuthenticated();
```

## 🛠 Development

### Testing

Run the test suite:

```bash
yarn test:api
```

### Debugging

Enable debug logging:

```typescript
// Enable debug logging
localStorage.setItem('debug', 'api:client*');

// Disable debug logging
localStorage.removeItem('debug');
```

## 📝 License

MIT



```typescript
// Create a new resource
const newPost = await apiClient.post<Post>('/posts', {
  title: 'Hello World',
  body: 'This is my first post',
  userId: 1
});
```

#### File Upload

```typescript
// Upload a file with progress tracking
const result = await apiClient.upload<{ url: string }>(
  '/upload',
  fileInput.files[0],
  'document',
  { type: 'profile_picture' },
  (progress) => {
    console.log(`Upload progress: ${progress}%`);
  }
);
```

### Error Handling

```typescript
try {
  const data = await apiClient.get<User>('/users/123');
} catch (error) {
  if (error.response) {
    // The request was made and the server responded with a status code
    console.error('Error status:', error.status);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
  } else if (error.request) {
    // The request was made but no response was received
    console.error('No response received');
  } else {
    // Something happened in setting up the request
    console.error('Request error:', error.message);
  }
}
```

### Pagination

```typescript
// Get paginated results
const { data, total, page, totalPages } = await apiClient.getPaginated<Post>('/posts', {
  page: 1,
  limit: 10,
  sort: 'createdAt',
  order: 'desc'
});
```

### Authentication

```typescript
// Set auth token (usually after login)
apiClient.setAuthToken('your.jwt.token');

// Clear auth token (on logout)
apiClient.clearAuthToken();
```

### Request Cancellation

```typescript
// Create a cancellation token
const cancelToken = apiClient.cancelRequest('User cancelled');

// Use with a request
const request = apiClient.get('/data', { cancelToken });

// Later, cancel the request
// cancelToken.cancel();
```

## API Reference

### `get<T>(url: string, config?: RequestConfig): Promise<T>`

Send a GET request.

### `post<T, D = any>(url: string, data?: D, config?: RequestConfig<D>): Promise<T>`

Send a POST request.

### `put<T, D = any>(url: string, data?: D, config?: RequestConfig<D>): Promise<T>`

Send a PUT request.

### `delete<T>(url: string, config?: RequestConfig): Promise<T>`

Send a DELETE request.

### `patch<T, D = any>(url: string, data?: D, config?: RequestConfig<D>): Promise<T>`

Send a PATCH request.

### `getPaginated<T>(url: string, params?: Record<string, any>, config?: RequestConfig): Promise<PaginatedResponse<T>>`

Fetch paginated data.

### `upload<T>(url: string, file: File, fieldName?: string, data?: Record<string, any>, onProgress?: (progress: number) => void): Promise<T>`

Upload a file with progress tracking.

### `setAuthToken(token: string): void`

Set the authentication token for subsequent requests.

### `clearAuthToken(): void`

Clear the authentication token.

### `cancelRequest(message?: string): CancelToken`

Create a cancellation token for cancelling requests.

## Error Handling

The API client provides consistent error handling with the following structure:

```typescript
{
  message: string;      // Human-readable error message
  code?: string;        // Error code (e.g., 'NOT_FOUND', 'UNAUTHORIZED')
  status?: number;     // HTTP status code
  details?: any;        // Additional error details
}
```

## Configuration

### Environment Variables

- `VITE_API_BASE_URL`: Base URL for API requests (e.g., 'https://api.example.com')

### Custom Configuration

You can customize the Axios instance by accessing `apiClient.client`:

```typescript
// Set default headers
apiClient.client.defaults.headers.common['X-Custom-Header'] = 'value';

// Set request timeout (in milliseconds)
apiClient.client.defaults.timeout = 30000;

// Add a request interceptor
apiClient.client.interceptors.request.use(
  (config) => {
    // Do something before request is sent
    return config;
  },
  (error) => {
    // Do something with request error
    return Promise.reject(error);
  }
);
```

## Best Practices

1. **Type Safety**: Always provide type parameters for better type checking and IDE support.
2. **Error Handling**: Always wrap API calls in try/catch blocks and handle errors appropriately.
3. **Cancellation**: Use cancellation tokens for requests that might need to be cancelled (e.g., when component unmounts).
4. **Progress Tracking**: Use the upload progress callback for better UX during file uploads.
5. **Environment Variables**: Use environment variables for configuration values that change between environments.

## License

MIT
