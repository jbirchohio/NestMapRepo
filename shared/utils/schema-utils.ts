import { camelCase, snakeCase, isPlainObject, isArray } from 'lodash';
import type { 
  ID,
  ISO8601DateTime
} from '../types/index.js';

type AnyObject = Record<string, unknown>;

type UserType = {
  id: ID;
  email: string;
  firstName: string;
  lastName: string;
};

type OrganizationType = {
  id: ID;
  name: string;
  slug: string;
  plan: string;
};

type TripType = {
  id: ID;
  name: string;
  startDate: ISO8601DateTime;
  endDate: ISO8601DateTime;
  createdById: ID;
};

type TripMemberType = {
  id: ID;
  tripId: ID;
  userId: ID;
  role: string;
};

/**
 * Converts an object's keys from snake_case to camelCase
 */
export function toCamelCase<T = AnyObject>(obj: AnyObject | AnyObject[]): T {
  if (isArray(obj)) {
    return obj.map(item => toCamelCase(item)) as unknown as T;
  }
  
  if (!isPlainObject(obj)) {
    return obj as T;
  }

  return Object.keys(obj).reduce((result, key) => {
    const value = obj[key];
    const camelKey = camelCase(key);
    
    let newValue = value;
    if (isPlainObject(value)) {
      newValue = toCamelCase(value);
    } else if (Array.isArray(value)) {
      newValue = value.map(item => 
        isPlainObject(item) ? toCamelCase(item) : item
      );
    }
    
    return { ...result, [camelKey]: newValue };
  }, {} as AnyObject) as T;
}

/**
 * Converts an object's keys from camelCase to snake_case
 */
export function toSnakeCase<T = AnyObject>(obj: AnyObject | AnyObject[] | unknown): T {
  // Handle null or undefined
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return (obj as unknown[]).map(item => 
      isPlainObject(item) ? toSnakeCase(item) : item
    ) as unknown as T;
  }
  
  // Handle non-object types
  if (!isPlainObject(obj)) {
    return obj as T;
  }

  // Handle plain objects
  return Object.entries(obj).reduce((result, [key, value]) => {
    const snakeKey = snakeCase(key);
    
    // Recursively process nested objects/arrays
    let newValue = value;
    if (isPlainObject(value)) {
      newValue = toSnakeCase(value);
    } else if (Array.isArray(value)) {
      newValue = value.map(item => 
        isPlainObject(item) ? toSnakeCase(item) : item
      );
    }
    
    return { ...result, [snakeKey]: newValue };
  }, {} as Record<string, unknown>) as unknown as T;
}

/**
 * Type guard for checking if an object matches a specific interface
 */
export function isType<T>(
  obj: unknown,
  requiredFields: (keyof T)[]
): obj is T {
  // Check if obj is an object and not null
  if (!obj || typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  // Safely check if all required fields exist in the object
  return requiredFields.every(field => {
    // Handle both string and symbol property keys
    const fieldStr = String(field);
    return Object.prototype.hasOwnProperty.call(obj, fieldStr);
  });
}

/**
 * Validates that an object matches the expected type structure
 */
export function validateType<T>(
  obj: unknown,
  typeName: string,
  requiredFields: (keyof T)[]
): T {
  if (!isType<T>(obj, requiredFields)) {
    const missingFields = requiredFields.filter(
      field => !(obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, String(field)))
    );
    
    throw new Error(
      `Invalid ${typeName} object. Missing required fields: ${missingFields.join(', ')}`
    );
  }
  
  return obj as T;
}

// Type guards implementation
const typeGuards = {
  isUser: (obj: unknown): obj is UserType => 
    isType<UserType>(obj, ['id', 'email', 'firstName', 'lastName']),
    
  isOrganization: (obj: unknown): obj is OrganizationType =>
    isType<OrganizationType>(obj, ['id', 'name', 'slug', 'plan']),
    
  isTrip: (obj: unknown): obj is TripType =>
    isType<TripType>(obj, ['id', 'name', 'startDate', 'endDate', 'createdById']),
    
  isTripMember: (obj: unknown): obj is TripMemberType =>
    isType<TripMemberType>(obj, ['id', 'tripId', 'userId', 'role'])
};

// Initialize global SharedTypes if it doesn't exist
declare global {
  // eslint-disable-next-line no-var
  var SharedTypes: {
    TypeGuards: typeof typeGuards;
  };
}

global.SharedTypes = global.SharedTypes || { TypeGuards: typeGuards };

export const TypeGuards = typeGuards;
