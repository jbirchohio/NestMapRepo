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
export const toCamelCase = (str) => {
    return str.replace(/(_\w)/g, (match) => match[1].toUpperCase());
};
/**
 * Converts a string from camelCase to snake_case
 * @example
 * toSnakeCase('helloWorld') // returns 'hello_world'
 */
export const toSnakeCase = (str) => {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};
/**
 * Recursively converts all keys of an object from snake_case to camelCase
 */
export const convertKeysToCamel = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(convertKeysToCamel);
    }
    if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        return Object.entries(obj).reduce((acc, [key, value]) => {
            const newKey = toCamelCase(key);
            return {
                ...acc,
                [newKey]: convertKeysToCamel(value)
            };
        }, {});
    }
    return obj;
};
/**
 * Recursively converts all keys of an object from camelCase to snake_case
 */
export const convertKeysToSnake = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(convertKeysToSnake);
    }
    if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        return Object.entries(obj).reduce((acc, [key, value]) => {
            const newKey = toSnakeCase(key);
            return {
                ...acc,
                [newKey]: convertKeysToSnake(value)
            };
        }, {});
    }
    return obj;
};
//# sourceMappingURL=case-utils.js.map