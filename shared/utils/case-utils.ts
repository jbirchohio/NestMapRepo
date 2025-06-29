/**
 * Case conversion utilities
 * 
 * Provides consistent case conversion between:
 * - camelCase (JavaScript/TypeScript)
 * - snake_case (Database/API)
 * 
 * Usage:
 * import { toCamelCase, toSnakeCase } from './case-utils';
 */

/**
 * Converts a string from snake_case to camelCase
 * @example
 * toCamelCase('hello_world') // returns 'helloWorld'
 */
export const toCamelCase = (str: string): string => {
  return str.replace(/(_\w)/g, (match) => match[1].toUpperCase());
};

/**
 * Converts a string from camelCase to snake_case
 * @example
 * toSnakeCase('helloWorld') // returns 'hello_world'
 */
export const toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

/**
 * Recursively converts all keys of an object from snake_case to camelCase
 */
export const convertKeysToCamel = <T>(obj: unknown): T => {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamel) as unknown as T;
  }
  
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.entries(obj as Record<string, unknown>).reduce((acc, [key, value]) => {
      const newKey = toCamelCase(key);
      return {
        ...acc,
        [newKey]: convertKeysToCamel(value)
      };
    }, {} as T);
  }
  
  return obj as T;
};

/**
 * Recursively converts all keys of an object from camelCase to snake_case
 */
export const convertKeysToSnake = <T>(obj: unknown): T => {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnake) as unknown as T;
  }
  
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.entries(obj as Record<string, unknown>).reduce((acc, [key, value]) => {
      const newKey = toSnakeCase(key);
      return {
        ...acc,
        [newKey]: convertKeysToSnake(value)
      };
    }, {} as T);
  }
  
  return obj as T;
};
