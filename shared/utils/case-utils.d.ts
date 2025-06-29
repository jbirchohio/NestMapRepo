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
export declare const toCamelCase: (str: string) => string;
/**
 * Converts a string from camelCase to snake_case
 * @example
 * toSnakeCase('helloWorld') // returns 'hello_world'
 */
export declare const toSnakeCase: (str: string) => string;
/**
 * Recursively converts all keys of an object from snake_case to camelCase
 */
export declare const convertKeysToCamel: <T>(obj: unknown) => T;
/**
 * Recursively converts all keys of an object from camelCase to snake_case
 */
export declare const convertKeysToSnake: <T>(obj: unknown) => T;
//# sourceMappingURL=case-utils.d.ts.map