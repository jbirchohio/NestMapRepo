// Application configuration constants

export const APP_CONFIG = {
  // Map configuration
  MAP: {
    DEFAULT_CENTER: [-74.006, 40.7128] as [number, number], // NYC coordinates
    DEFAULT_ZOOM: 12,
    DOM_READY_DELAY: 100, // milliseconds
    RESIZE_DELAY: 100, // milliseconds
  },

  // Activity and trip configuration
  ACTIVITIES: {
    DEFAULT_DURATION: 120, // minutes (2 hours)
    TRAVEL_BUFFER: 15, // minutes
    HIGH_CONFLICT_THRESHOLD: 30, // minutes
    PREPARATION_REMINDER_HOURS: 2,
    BOOKING_REMINDER_HOURS: 24,
    DEPARTURE_REMINDER_MINUTES: 30,
  },

  // Travel configuration
  TRAVEL: {
    AVERAGE_CITY_SPEED: 20, // km/h (walking + transit)
    EARTH_RADIUS: 6371, // kilometers
  },

  // Venue operating hours (default patterns)
  VENUE_HOURS: {
    museum: { open: 9, close: 17, closedDays: ['monday'] as string[] },
    restaurant: { open: 11, close: 22, closedDays: [] as string[] },
    park: { open: 6, close: 20, closedDays: [] as string[] },
    church: { open: 8, close: 18, closedDays: [] as string[] },
    shopping: { open: 10, close: 21, closedDays: ['sunday'] as string[] }
  },

  // API configuration
  API: {
    REQUEST_TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
  },

  // UI configuration
  UI: {
    ANIMATION_DURATION: 300, // milliseconds
    DEBOUNCE_DELAY: 500, // milliseconds
    TOAST_DURATION: 5000, // milliseconds
  },

  // Optimization thresholds
  OPTIMIZATION: {
    MIN_ACTIVITIES_FOR_AI: 3,
    MAX_CONFLICTS_AUTO_FIX: 10,
    EFFICIENCY_GAIN_THRESHOLD: 10, // percentage
  }
} as const;

// Type-safe access to config values
export type AppConfig = typeof APP_CONFIG;
