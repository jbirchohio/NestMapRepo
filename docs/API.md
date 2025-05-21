# NestMap API Documentation

This document outlines the available API endpoints for the NestMap application.

## Authentication

All API endpoints except for user creation and authentication require a valid session. Authentication is handled through Supabase.

## User Endpoints

### Create User
- **URL**: `/api/users`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "username": "string",
    "email": "string",
    "auth_id": "string",
    "display_name": "string (optional)",
    "avatar_url": "string (optional)"
  }
  ```
- **Response**: The created user object

### Get User by Auth ID
- **URL**: `/api/users/auth/:authId`
- **Method**: `GET`
- **Response**: The user object or 404 if not found

## Trip Endpoints

### Get All Trips
- **URL**: `/api/trips`
- **Method**: `GET`
- **Query Parameters**:
  - `userId`: Filter by user ID
- **Response**: Array of trip objects

### Get Trip by ID
- **URL**: `/api/trips/:id`
- **Method**: `GET`
- **Response**: The trip object or 404 if not found

### Create Trip
- **URL**: `/api/trips`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "title": "string",
    "start_date": "string (ISO date)",
    "end_date": "string (ISO date)",
    "user_id": "number",
    "city": "string (optional)",
    "country": "string (optional)",
    "location": "string (optional)",
    "collaborators": "array (optional)",
    "is_public": "boolean (optional)",
    "sharing_enabled": "boolean (optional)",
    "share_code": "string (optional)"
  }
  ```
- **Response**: The created trip object

### Update Trip
- **URL**: `/api/trips/:id`
- **Method**: `PUT`
- **Body**: Any trip properties to update
- **Response**: The updated trip object

### Delete Trip
- **URL**: `/api/trips/:id`
- **Method**: `DELETE`
- **Response**: Success message

## Activity Endpoints

### Get Activities by Trip ID
- **URL**: `/api/trips/:id/activities`
- **Method**: `GET`
- **Response**: Array of activity objects

### Create Activity
- **URL**: `/api/activities`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "trip_id": "number",
    "title": "string",
    "date": "string (ISO date)",
    "time": "string",
    "location_name": "string",
    "latitude": "string (optional)",
    "longitude": "string (optional)",
    "notes": "string (optional)",
    "tag": "string (optional)",
    "assigned_to": "string (optional)",
    "order": "number",
    "travel_mode": "string (optional)",
    "completed": "boolean (optional)"
  }
  ```
- **Response**: The created activity object

### Toggle Activity Completion
- **URL**: `/api/activities/:id/toggle-complete`
- **Method**: `PUT`
- **Body**:
  ```json
  {
    "completed": "boolean"
  }
  ```
- **Response**: The updated activity object

### Update Activity
- **URL**: `/api/activities/:id`
- **Method**: `PUT`
- **Body**: Any activity properties to update
- **Response**: The updated activity object

### Delete Activity
- **URL**: `/api/activities/:id`
- **Method**: `DELETE`
- **Response**: Success message

## Todo Endpoints

### Get Todos by Trip ID
- **URL**: `/api/trips/:id/todos`
- **Method**: `GET`
- **Response**: Array of todo objects

### Create Todo
- **URL**: `/api/todos`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "trip_id": "number",
    "task": "string",
    "completed": "boolean (optional)",
    "assigned_to": "string (optional)"
  }
  ```
- **Response**: The created todo object

### Update Todo
- **URL**: `/api/todos/:id`
- **Method**: `PUT`
- **Body**: Any todo properties to update
- **Response**: The updated todo object

### Delete Todo
- **URL**: `/api/todos/:id`
- **Method**: `DELETE`
- **Response**: Success message

## Note Endpoints

### Get Notes by Trip ID
- **URL**: `/api/trips/:id/notes`
- **Method**: `GET`
- **Response**: Array of note objects

### Create Note
- **URL**: `/api/notes`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "trip_id": "number",
    "content": "string"
  }
  ```
- **Response**: The created note object

### Update Note
- **URL**: `/api/notes/:id`
- **Method**: `PUT`
- **Body**: Any note properties to update
- **Response**: The updated note object

### Delete Note
- **URL**: `/api/notes/:id`
- **Method**: `DELETE`
- **Response**: Success message

## AI Assistant Endpoints

### Summarize Day
- **URL**: `/api/ai/summarize-day`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "activities": "array of activity objects"
  }
  ```
- **Response**: Summary text

### Suggest Food
- **URL**: `/api/ai/suggest-food`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "location": "string",
    "foodType": "string (optional)"
  }
  ```
- **Response**: Food suggestions

### Detect Time Conflicts
- **URL**: `/api/ai/detect-conflicts`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "activities": "array of activity objects"
  }
  ```
- **Response**: Conflict information

### Generate Themed Itinerary
- **URL**: `/api/ai/themed-itinerary`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "location": "string",
    "theme": "string",
    "days": "number",
    "preferences": "string (optional)"
  }
  ```
- **Response**: Themed itinerary suggestions

### Trip Assistant
- **URL**: `/api/ai/assistant`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "question": "string",
    "tripContext": "object with trip details"
  }
  ```
- **Response**: Assistant response

### Find Location
- **URL**: `/api/ai/find-location`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "searchQuery": "string",
    "cityContext": "string (optional)"
  }
  ```
- **Response**: Location suggestions

### Weather-Based Activities
- **URL**: `/api/ai/weather-activities`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "location": "string",
    "date": "string (ISO date)",
    "weather": "string"
  }
  ```
- **Response**: Weather-appropriate activity suggestions

### Budget Options
- **URL**: `/api/ai/budget-options`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "location": "string",
    "duration": "number",
    "budgetLevel": "string",
    "interests": "string (optional)"
  }
  ```
- **Response**: Budget recommendations and suggestions