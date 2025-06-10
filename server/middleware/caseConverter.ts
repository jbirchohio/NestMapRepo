import { Request, Response, NextFunction } from 'express';

// Converts a string from camelCase to snake_case
const toSnakeCase = (str: string): string =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

// Converts a string from snake_case to camelCase
const toCamelCase = (str: string): string =>
  str.replace(/(_\w)/g, (m) => m[1].toUpperCase());

// Recursively converts keys of an object or array of objects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convertKeys = (obj: any, converter: (key: string) => string): any => {
  if (Array.isArray(obj)) {
    return obj.map((v) => convertKeys(v, converter));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const newKey = converter(key);
      result[newKey] = convertKeys(obj[key], converter);
      return result;
    }, {} as { [key: string]: any });
  }
  return obj;
};

export const caseConverterMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Convert incoming request body from camelCase to snake_case
  if (req.body && Object.keys(req.body).length > 0) {
    req.body = convertKeys(req.body, toSnakeCase);
  }

  // Monkey-patch res.json to convert outgoing response from snake_case to camelCase
  const originalJson = res.json;
  res.json = function (body) {
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
