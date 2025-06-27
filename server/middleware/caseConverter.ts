/**
 * SINGLE SOURCE OF TRUTH: Case Conversion Middleware
 *
 * This is the canonical implementation for all case conversion functionality in the application.
 * All case conversion logic should be centralized through this module to ensure consistency.
 *
 * Features:
 * - Converts between camelCase and snake_case
 * - Handles nested objects and arrays
 * - Preserves non-object values
 *
 * DO NOT create duplicate case conversion implementations - extend this one if needed.
 */
import type { Request, Response, NextFunction } from 'express';

type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;
// Converts a string from camelCase to snake_case
const toSnakeCase = (str: string): string => str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
// Converts a string from snake_case to camelCase
const toCamelCase = (str: string): string => str.replace(/(_\w)/g, (m) => m[1].toUpperCase());
// Recursively converts keys of an object or array of objects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convertKeys = (obj: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */, converter: (key: string) => string): any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ => {
    if (Array.isArray(obj)) {
        return obj.map((v) => convertKeys(v, converter));
    }
    else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
            const newKey = converter(key);
            result[newKey] = convertKeys(obj[key], converter);
            return result;
        }, {} as {
            [key: string]: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */;
        });
    }
    return obj;
};
export const caseConverterMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    // Convert incoming request body from camelCase to snake_case
    if (req.body && Object.keys(req.body).length > 0) {
        req.body = convertKeys(req.body, toSnakeCase);
    }
    // Monkey-patch res.json to convert outgoing response from snake_case to camelCase
    const originalJson = res.json;
    res.json = function (body: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) {
        let newBody = body;
        if (newBody) {
            newBody = convertKeys(newBody, toCamelCase);
        }
        // Restore original function and call it to avoid issues with other middleware
        res.json = originalJson;
        return res.json(newBody);
    };
    next();
};
