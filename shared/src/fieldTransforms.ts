// Field transformation utilities for converting between camelCase and snake_case
// Convert snake_case to camelCase
export function snakeToCamel(obj: any): any {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => snakeToCamel(item));
    }
    if (obj instanceof Date) {
        return obj;
    }
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = snakeToCamel(value);
    }
    return result;
}
// Convert camelCase to snake_case
export function camelToSnake(obj: any): any {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => camelToSnake(item));
    }
    if (obj instanceof Date) {
        return obj;
    }
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = camelToSnake(value);
    }
    return result;
}
// Transform frontend trip data to database format
export function transformTripToDatabase(tripData: any) {
    const result: any = {};
    // Handle fields that need camelCase to snake_case transformation
    if (tripData.title !== undefined)
        result.title = tripData.title;
    if (tripData.startDate !== undefined)
        result.start_date = tripData.startDate;
    if (tripData.endDate !== undefined)
        result.end_date = tripData.endDate;
    if (tripData.userId !== undefined)
        result.user_id = tripData.userId;
    if (tripData.organizationId !== undefined)
        result.organization_id = tripData.organizationId;
    if (tripData.isPublic !== undefined)
        result.is_public = tripData.isPublic;
    if (tripData.shareCode !== undefined)
        result.share_code = tripData.shareCode;
    if (tripData.sharingEnabled !== undefined)
        result.sharing_enabled = tripData.sharingEnabled;
    if (tripData.sharePermission !== undefined)
        result.share_permission = tripData.sharePermission;
    if (tripData.cityLatitude !== undefined)
        result.city_latitude = tripData.cityLatitude;
    if (tripData.cityLongitude !== undefined)
        result.city_longitude = tripData.cityLongitude;
    if (tripData.hotelLatitude !== undefined)
        result.hotel_latitude = tripData.hotelLatitude;
    if (tripData.hotelLongitude !== undefined)
        result.hotel_longitude = tripData.hotelLongitude;
    if (tripData.completedAt !== undefined)
        result.completed_at = tripData.completedAt;
    if (tripData.tripType !== undefined)
        result.trip_type = tripData.tripType;
    if (tripData.clientName !== undefined)
        result.client_name = tripData.clientName;
    if (tripData.projectType !== undefined)
        result.project_type = tripData.projectType;
    // Handle fields that don't need transformation
    if (tripData.city !== undefined)
        result.city = tripData.city;
    if (tripData.country !== undefined)
        result.country = tripData.country;
    if (tripData.location !== undefined)
        result.location = tripData.location;
    if (tripData.hotel !== undefined)
        result.hotel = tripData.hotel;
    if (tripData.completed !== undefined)
        result.completed = tripData.completed;
    if (tripData.budget !== undefined)
        result.budget = tripData.budget;
    if (tripData.collaborators !== undefined)
        result.collaborators = tripData.collaborators;
    if (tripData.organization !== undefined)
        result.organization = tripData.organization;
    return result;
}
// Transform frontend activity data to database format
export function transformActivityToDatabase(activityData: any) {
    const result: any = {};
    // Handle fields that need camelCase to snake_case transformation
    if (activityData.tripId !== undefined)
        result.trip_id = activityData.tripId;
    if (activityData.locationName !== undefined)
        result.location_name = activityData.locationName;
    if (activityData.organizationId !== undefined)
        result.organization_id = activityData.organizationId;
    if (activityData.assignedTo !== undefined)
        result.assigned_to = activityData.assignedTo;
    if (activityData.travelMode !== undefined)
        result.travel_mode = activityData.travelMode;
    // Handle fields that don't need transformation
    if (activityData.title !== undefined)
        result.title = activityData.title;
    if (activityData.date !== undefined)
        result.date = activityData.date;
    if (activityData.time !== undefined)
        result.time = activityData.time;
    if (activityData.order !== undefined)
        result.order = activityData.order;
    if (activityData.completed !== undefined)
        result.completed = activityData.completed;
    if (activityData.latitude !== undefined)
        result.latitude = activityData.latitude;
    if (activityData.longitude !== undefined)
        result.longitude = activityData.longitude;
    if (activityData.notes !== undefined)
        result.notes = activityData.notes;
    if (activityData.tag !== undefined)
        result.tag = activityData.tag;
    return result;
}
