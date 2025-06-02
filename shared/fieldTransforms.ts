/**
 * Field transformation utilities to convert between frontend camelCase and database snake_case
 */

// Convert camelCase to snake_case
export function camelToSnake(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(camelToSnake);
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = camelToSnake(value);
  }
  return result;
}

// Convert snake_case to camelCase
export function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = snakeToCamel(value);
  }
  return result;
}

// Transform frontend trip data to database format
export function transformTripToDatabase(tripData: any) {
  const result: any = {};
  
  // Handle fields that need camelCase to snake_case transformation
  if (tripData.title !== undefined) result.title = tripData.title;
  if (tripData.startDate !== undefined) result.start_date = tripData.startDate;
  if (tripData.endDate !== undefined) result.end_date = tripData.endDate;
  if (tripData.userId !== undefined) result.user_id = tripData.userId;
  if (tripData.organizationId !== undefined) result.organization_id = tripData.organizationId;
  if (tripData.isPublic !== undefined) result.is_public = tripData.isPublic;
  if (tripData.shareCode !== undefined) result.share_code = tripData.shareCode;
  if (tripData.sharingEnabled !== undefined) result.sharing_enabled = tripData.sharingEnabled;
  if (tripData.sharePermission !== undefined) result.share_permission = tripData.sharePermission;
  if (tripData.cityLatitude !== undefined) result.city_latitude = tripData.cityLatitude;
  if (tripData.cityLongitude !== undefined) result.city_longitude = tripData.cityLongitude;
  if (tripData.hotelLatitude !== undefined) result.hotel_latitude = tripData.hotelLatitude;
  if (tripData.hotelLongitude !== undefined) result.hotel_longitude = tripData.hotelLongitude;
  if (tripData.completedAt !== undefined) result.completed_at = tripData.completedAt;
  if (tripData.tripType !== undefined) result.trip_type = tripData.tripType;
  if (tripData.clientName !== undefined) result.client_name = tripData.clientName;
  if (tripData.projectType !== undefined) result.project_type = tripData.projectType;
  
  // Handle fields that don't need transformation
  if (tripData.city !== undefined) result.city = tripData.city;
  if (tripData.country !== undefined) result.country = tripData.country;
  if (tripData.location !== undefined) result.location = tripData.location;
  if (tripData.hotel !== undefined) result.hotel = tripData.hotel;
  if (tripData.completed !== undefined) result.completed = tripData.completed;
  if (tripData.budget !== undefined) result.budget = tripData.budget;
  if (tripData.collaborators !== undefined) result.collaborators = tripData.collaborators;
  if (tripData.organization !== undefined) result.organization = tripData.organization;
  
  return result;
}

// Transform database trip data to frontend format
export function transformTripToFrontend(dbTrip: any) {
  return {
    id: dbTrip.id,
    title: dbTrip.title,
    startDate: dbTrip.start_date,
    endDate: dbTrip.end_date,
    userId: dbTrip.user_id,
    organizationId: dbTrip.organization_id,
    collaborators: dbTrip.collaborators || [],
    isPublic: dbTrip.is_public || false,
    shareCode: dbTrip.share_code,
    sharingEnabled: dbTrip.sharing_enabled || false,
    sharePermission: dbTrip.share_permission || 'read-only',
    city: dbTrip.city,
    country: dbTrip.country,
    location: dbTrip.location,
    cityLatitude: dbTrip.city_latitude,
    cityLongitude: dbTrip.city_longitude,
    hotel: dbTrip.hotel,
    hotelLatitude: dbTrip.hotel_latitude,
    hotelLongitude: dbTrip.hotel_longitude,
    completed: dbTrip.completed || false,
    completedAt: dbTrip.completed_at,
    tripType: dbTrip.trip_type || 'personal',
    clientName: dbTrip.client_name,
    projectType: dbTrip.project_type,
    organization: dbTrip.organization,
    budget: dbTrip.budget,
    createdAt: dbTrip.created_at,
    updatedAt: dbTrip.updated_at
  };
}

// Transform frontend activity data to database format
export function transformActivityToDatabase(activityData: any) {
  return {
    trip_id: activityData.trip_id,
    organization_id: activityData.organization_id,
    title: activityData.title,
    date: activityData.date,
    time: activityData.time,
    location_name: activityData.locationName,
    latitude: activityData.latitude,
    longitude: activityData.longitude,
    notes: activityData.notes,
    tag: activityData.tag,
    assigned_to: activityData.assignedTo,
    order: activityData.order,
    travel_mode: activityData.travelMode || 'walking',
    completed: activityData.completed || false
  };
}

// Transform frontend todo data to database format
export function transformTodoToDatabase(todoData: any) {
  return {
    trip_id: todoData.trip_id,
    organization_id: todoData.organization_id,
    task: todoData.task,
    completed: todoData.completed || false,
    assigned_to: todoData.assignedTo
  };
}

// Transform frontend note data to database format
export function transformNoteToDatabase(noteData: any) {
  return {
    trip_id: noteData.trip_id,
    organization_id: noteData.organization_id,
    content: noteData.content
  };
}