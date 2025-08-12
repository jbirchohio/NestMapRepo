// Helper to sanitize dates in objects to prevent "Invalid time value" errors
export function sanitizeDates(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeDates(item));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const sanitized: any = {};

    for (const key in obj) {
      const value = obj[key];

      // Check if this looks like a date field
      if (key.includes('_at') || key.includes('At') || key === 'date' || key === 'Date') {
        // Try to validate the date
        if (value) {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            // Invalid date - set to null or current date
            sanitized[key] = null;
          } else {
            sanitized[key] = value;
          }
        } else {
          sanitized[key] = value;
        }
      } else if (typeof value === 'object') {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeDates(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  return obj;
}

// Middleware to sanitize response dates
export function sanitizeResponseDates(data: any): any {
  return sanitizeDates(data);
}