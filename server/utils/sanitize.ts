import { z } from 'zod';

type Primitive = string | number | boolean | null | undefined;
type Sanitized<T> = T extends Primitive
  ? string
  : T extends Array<infer U>
  ? Array<Sanitized<U>>
  : T extends object
  ? { [K in keyof T]: Sanitized<T[K]> }
  : never;

// Base schema for sanitized strings
const sanitizedString = z.string().transform((val) =>
  val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
);

// Create a recursive schema for sanitizing objects
function createSanitizedSchema<T>(): z.ZodType<Sanitized<T>> {
  return z.lazy(() =>
    z.union([
      sanitizedString,
      z.array(createSanitizedSchema<unknown>()),
      z.record(createSanitizedSchema<unknown>())
    ])
  ) as unknown as z.ZodType<Sanitized<T>>;
}

/**
 * Sanitizes an object by removing potential XSS patterns from strings
 * and recursively processing nested objects and arrays
 */
export function sanitizeObject<T>(obj: T): Sanitized<T> {
  if (obj === null || obj === undefined) {
    return '' as Sanitized<T>;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as Sanitized<T>;
  }

  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const key in obj) {
      result[key] = sanitizeObject((obj as Record<string, unknown>)[key]);
    }
    return result as Sanitized<T>;
  }

  // Handle primitives
  if (typeof obj === 'string') {
    return sanitizedString.parse(obj) as Sanitized<T>;
  }

  // For numbers, booleans, etc., convert to string and sanitize
  return sanitizedString.parse(String(obj)) as Sanitized<T>;
}

/**
 * Middleware to sanitize request body
 */
export function sanitizeRequestBody() {
  return (req: any, _res: any, next: () => void) => {
    if (req.body && typeof req.body === 'object') {
      try {
        req.body = sanitizeObject(req.body);
      } catch (error) {
        console.error('Sanitization error:', error);
      }
    }
    next();
  };
}
