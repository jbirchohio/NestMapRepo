# JWT Authentication Implementation Guide

## Table of Contents
- [Environment Setup](#environment-setup)
- [Database Updates](#database-updates)
- [API Endpoints](#api-endpoints)
- [Frontend Implementation](#frontend-implementation)
- [Security Considerations](#security-considerations)
- [Testing](#testing)
- [Monitoring and Logging](#monitoring-and-logging)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [Future Enhancements](#future-enhancements)

## Environment Setup

### Required Environment Variables
Add these to your `.env` file:
```env
JWT_SECRET=your-secure-secret-here
JWT_REFRESH_SECRET=your-secure-refresh-secret-here
```

### Install Dependencies
```bash
npm install jsonwebtoken @types/jsonwebtoken cookie-parser @types/cookie-parser bcrypt @types/bcrypt
```

## Database Updates

### Required Schema Changes
Ensure your users table has these columns:
- `password_hash`: string (for bcrypt hashed passwords)
- `refresh_token`: string (optional, for token invalidation)
- `token_version`: integer (for token versioning)

## API Endpoints

### Authentication Endpoints
- `POST /api/auth/login`
  - Body: `{ "email": "user@example.com", "password": "securepassword" }`
  - Returns: Access token and sets HTTP-only refresh token cookie

- `POST /api/auth/refresh-token`
  - Requires: Refresh token in cookies
  - Returns: New access token

- `POST /api/auth/logout`
  - Clears the refresh token cookie

- `GET /api/auth/me`
  - Requires: Valid access token
  - Returns: Current user data

## Frontend Implementation

### Token Management
1. **Access Token**:
   - Store in memory (not localStorage)
   - Include in `Authorization: Bearer <token>` header

2. **Refresh Token**:
   - Automatically managed via HTTP-only cookies
   - Implement automatic token refresh on 401 responses

### Example Axios Interceptor
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

// Add request interceptor for auth token
api.interceptors.request.use(config => {
  const token = /* get token from your state management */;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const { data } = await axios.post('/api/auth/refresh-token', {}, { withCredentials: true });
        const { accessToken } = data;
        
        // Update the stored token
        /* update token in your state management */
        
        // Update the authorization header
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        // Retry the original request
        return api(originalRequest);
      } catch (error) {
        // Refresh token failed, redirect to login
        /* handle logout */
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);
```

## Security Considerations

1. **Rate Limiting**
   - Implement rate limiting on authentication endpoints
   - Consider using `express-rate-limit`

2. **Token Invalidation**
   - Implement token blacklisting for logout
   - Add token versioning to invalidate all tokens on password change

3. **CORS Configuration**
   - Configure CORS to only allow your frontend domains
   - Set appropriate CORS headers

## Testing

### Test Cases to Implement
1. Successful login/logout flow
2. Token refresh flow
3. Expired token handling
4. Invalid token scenarios
5. Concurrent session handling

## Monitoring and Logging

1. **Logging**
   - Log authentication attempts (success/failure)
   - Log token refresh events
   - Monitor for suspicious activity

2. **Monitoring**
   - Track failed login attempts
   - Monitor token refresh frequency
   - Set up alerts for unusual patterns

## Documentation

### API Documentation
Document your authentication flow and endpoints using:
- OpenAPI/Swagger
- Postman collection
- API Blueprint

### Frontend Documentation
Document how to:
- Implement the authentication flow
- Handle token refresh
- Manage protected routes

## Deployment

### Production Considerations
1. Set secure cookie flags:
   - `secure: true` (HTTPS only)
   - `sameSite: 'strict'` or `'lax'`
   - `httpOnly: true`

2. Rotate secrets:
   - Implement secret rotation for JWT secrets
   - Use environment-specific configuration

3. Monitoring:
   - Set up monitoring for authentication failures
   - Implement alerting for suspicious activities

## Future Enhancements

1. **Multi-factor Authentication**
   - Implement TOTP (Time-based One-Time Password)
   - Add SMS/Email verification

2. **Social Login**
   - Integrate OAuth providers (Google, GitHub, etc.)
   - Implement OAuth 2.0 flows

3. **Advanced Security**
   - Implement device fingerprinting
   - Add IP-based restrictions
   - Set up account lockout after failed attempts
