// Field transformation utilities for converting between camelCase and snake_case
import { 
  TripData, 
  DatabaseTripData, 
  ActivityData, 
  DatabaseActivityData 
} from './types/fieldTransforms.js';
import {
  camelToSnakeTransform,
  snakeToCamelTransform,
  transformTripToDatabase as autoTransformTripToDatabase,
  transformActivityToDatabase as autoTransformActivityToDatabase
} from './utils/autoTransform.js';

// Convert snake_case to camelCase (automated)
export function snakeToCamel(obj: unknown): unknown {
  return snakeToCamelTransform(obj);
}

// Convert camelCase to snake_case (automated)
export function camelToSnake(obj: unknown): unknown {
  return camelToSnakeTransform(obj);
}

// Transform frontend trip data to database format (automated)
export function transformTripToDatabase(tripData: TripData): DatabaseTripData {
  return autoTransformTripToDatabase(tripData) as DatabaseTripData;
}

// Transform frontend activity data to database format (automated)
export function transformActivityToDatabase(activityData: ActivityData): DatabaseActivityData {
  return autoTransformActivityToDatabase(activityData) as DatabaseActivityData;
}