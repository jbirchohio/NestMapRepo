// Automated field transformation utilities
import { TransformableObject, TransformedObject } from '../types/fieldTransforms.js';

type CaseConvention = 'camel' | 'snake' | 'pascal' | 'kebab';

interface TransformConfig {
  fromCase: CaseConvention;
  toCase: CaseConvention;
  fieldMappings?: Record<string, string>; // Custom field mappings
  excludeFields?: string[]; // Fields to skip transformation
  includeFields?: string[]; // Only transform these fields
}

/**
 * Converts string from one case convention to another
 */
function convertCase(str: string, fromCase: CaseConvention, toCase: CaseConvention): string {
  if (fromCase === toCase) return str;

  // First normalize to words array
  let words: string[];
  
  switch (fromCase) {
    case 'camel':
    case 'pascal':
      words = str.replace(/([A-Z])/g, ' $1').trim().toLowerCase().split(' ');
      break;
    case 'snake':
      words = str.split('_');
      break;
    case 'kebab':
      words = str.split('-');
      break;
    default:
      words = [str];
  }

  // Convert to target case
  switch (toCase) {
    case 'camel':
      return words[0] + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    case 'pascal':
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    case 'snake':
      return words.join('_');
    case 'kebab':
      return words.join('-');
    default:
      return words.join('');
  }
}

/**
 * Generic object transformer with configurable field mapping
 */
export function transformObject(
  obj: unknown, 
  config: TransformConfig
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => transformObject(item, config));
  }

  if (obj instanceof Date) {
    return obj;
  }

  const result: TransformedObject = {};
  const source = obj as Record<string, unknown>;

  for (const [key, value] of Object.entries(source)) {
    // Check if field should be excluded
    if (config.excludeFields?.includes(key)) {
      result[key] = value;
      continue;
    }

    // Check if only specific fields should be included
    if (config.includeFields && !config.includeFields.includes(key)) {
      continue;
    }

    // Use custom mapping if available
    let newKey = key;
    if (config.fieldMappings?.[key]) {
      newKey = config.fieldMappings[key];
    } else {
      newKey = convertCase(key, config.fromCase, config.toCase);
    }

    // Recursively transform nested objects
    result[newKey] = transformObject(value, config);
  }

  return result;
}

/**
 * Predefined transformation configurations
 */
export const TRANSFORM_CONFIGS = {
  camelToSnake: {
    fromCase: 'camel' as const,
    toCase: 'snake' as const,
  },
  snakeToCamel: {
    fromCase: 'snake' as const,
    toCase: 'camel' as const,
  },
  // Database-specific transformations with custom mappings
  tripToDatabase: {
    fromCase: 'camel' as const,
    toCase: 'snake' as const,
    fieldMappings: {
      // Keep these fields as-is
      city: 'city',
      country: 'country',
      location: 'location',
      hotel: 'hotel',
      completed: 'completed',
      budget: 'budget',
      collaborators: 'collaborators',
      organization: 'organization',
    }
  },
  activityToDatabase: {
    fromCase: 'camel' as const,
    toCase: 'snake' as const,
    fieldMappings: {
      // Keep these fields as-is
      title: 'title',
      date: 'date',
      time: 'time',
      order: 'order',
      completed: 'completed',
      latitude: 'latitude',
      longitude: 'longitude',
      notes: 'notes',
      tags: 'tags',
    }
  }
} as const;

/**
 * Convenience functions using predefined configs
 */
export function camelToSnakeTransform(obj: unknown): unknown {
  return transformObject(obj, TRANSFORM_CONFIGS.camelToSnake);
}

export function snakeToCamelTransform(obj: unknown): unknown {
  return transformObject(obj, TRANSFORM_CONFIGS.snakeToCamel);
}

export function transformTripToDatabase(tripData: unknown): unknown {
  return transformObject(tripData, TRANSFORM_CONFIGS.tripToDatabase);
}

export function transformActivityToDatabase(activityData: unknown): unknown {
  return transformObject(activityData, TRANSFORM_CONFIGS.activityToDatabase);
}
