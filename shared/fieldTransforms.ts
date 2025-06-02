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
  return {
    title: tripData.title,
    start_date: tripData.startDate,
    end_date: tripData.endDate,
    user_id: tripData.user_id,
    organization_id: tripData.organization_id,
    collaborators: tripData.collaborators || [],
    is_public: tripData.isPublic || false,
    share_code: tripData.share_code,
    sharing_enabled: tripData.sharingEnabled || false,
    share_permission: tripData.sharePermission || 'read-only',
    city: tripData.city,
    country: tripData.country,
    location: tripData.location,
    city_latitude: tripData.cityLatitude,
    city_longitude: tripData.cityLongitude,
    hotel: tripData.hotel,
    hotel_latitude: tripData.hotelLatitude,
    hotel_longitude: tripData.hotelLongitude,
    completed: tripData.completed || false,
    completed_at: tripData.completedAt,
    trip_type: tripData.tripType || 'personal',
    client_name: tripData.clientName,
    project_type: tripData.projectType,
    organization: tripData.organization,
    budget: tripData.budget
  };
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