/**
 * Query limits configuration to prevent unbounded queries
 * Protects against performance issues and DoS attacks
 */

export const QUERY_LIMITS = {
  // Default limits
  DEFAULT_LIMIT: 100,
  MAX_LIMIT: 1000,
  
  // Entity-specific limits
  TRIPS: {
    DEFAULT: 50,
    MAX: 200,
  },
  ACTIVITIES: {
    DEFAULT: 100,
    MAX: 500,
  },
  TEMPLATES: {
    DEFAULT: 50,
    MAX: 200,
    SEARCH: 100,
  },
  USERS: {
    DEFAULT: 50,
    MAX: 100,
  },
  REVIEWS: {
    DEFAULT: 25,
    MAX: 100,
  },
  PURCHASES: {
    DEFAULT: 50,
    MAX: 200,
  },
  DESTINATIONS: {
    DEFAULT: 25,
    MAX: 100,
  },
  NOTES: {
    DEFAULT: 50,
    MAX: 200,
  },
  TODOS: {
    DEFAULT: 50,
    MAX: 200,
  },
};

/**
 * Apply query limit with validation
 */
export function applyLimit(requestedLimit?: number, entityType?: keyof typeof QUERY_LIMITS): number {
  const configValue = entityType ? QUERY_LIMITS[entityType] : null;
  
  // Determine limits based on whether configValue is a number or an object
  const limits = typeof configValue === 'number'
    ? { DEFAULT: configValue, MAX: configValue }
    : configValue || { DEFAULT: QUERY_LIMITS.DEFAULT_LIMIT, MAX: QUERY_LIMITS.MAX_LIMIT };
  
  if (!requestedLimit || requestedLimit <= 0) {
    return limits.DEFAULT;
  }
  
  if (requestedLimit > limits.MAX) {
    return limits.MAX;
  }
  
  return requestedLimit;
}

/**
 * Parse and validate pagination parameters
 */
export function parsePagination(query: any) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = applyLimit(parseInt(query.limit));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}