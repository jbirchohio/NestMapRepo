# Remvana API Documentation

Simple REST API for the Remvana travel planning app.

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Auth
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout

### Trips
- `GET /api/trips` - Get user's trips
- `POST /api/trips` - Create new trip
- `GET /api/trips/:id` - Get trip details
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### Activities
- `GET /api/activities/trip/:tripId` - Get activities for a trip
- `POST /api/activities` - Add activity to trip
- `PUT /api/activities/:id` - Update activity
- `DELETE /api/activities/:id` - Delete activity

### Search
- `POST /api/viator/search` - Search Viator activities
- `POST /api/flights/search` - Search flights (Duffel)
- `POST /api/ai/suggestions` - Get AI trip suggestions

### User
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile

## Response Format

All responses follow this format:
```json
{
  "data": {},     // Response data
  "error": null   // Error message if any
}
```

## Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per user

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Server Error