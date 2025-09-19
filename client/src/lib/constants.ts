// API endpoints
export const API_ENDPOINTS = {
  TRIPS: "/api/trips",
  ACTIVITIES: "/api/activities",
  TODOS: "/api/todos",
  NOTES: "/api/notes",
  AI: {
    SUMMARIZE_DAY: "/api/ai/summarize-day",
    SUGGEST_FOOD: "/api/ai/suggest-food",
    DETECT_CONFLICTS: "/api/ai/detect-conflicts",
    THEMED_ITINERARY: "/api/ai/themed-itinerary",
    ASSISTANT: "/api/ai/trip-assistant",
    WEATHER_ACTIVITIES: "/api/ai/weather-activities",
    BUDGET_OPTIONS: "/api/ai/budget-options",
    FIND_LOCATION: "/api/ai/find-location",
    SUGGEST_ACTIVITIES: "/api/ai/suggest-activities",
    GENERATE_FULL_ITINERARY: "/api/ai/generate-full-itinerary",
    REGENERATE_ACTIVITY: "/api/ai/regenerate-activity",
    CHAT: "/api/ai/chat",
  },
  WEATHER: {
    FORECAST: "/api/weather/forecast",
  },
};

// Activity tags
export const ACTIVITY_TAGS = {
  CULTURE: {
    id: "culture",
    label: "Culture",
    color: "bg-[hsl(var(--tag-culture))]",
    icon: "🎨",
  },
  FOOD: {
    id: "food",
    label: "Food",
    color: "bg-[hsl(var(--tag-food))]",
    icon: "🍴",
  },
  EVENT: {
    id: "event",
    label: "Event",
    color: "bg-[hsl(var(--tag-event))]",
    icon: "🎭",
  },
  REST: {
    id: "rest",
    label: "Rest",
    color: "bg-[hsl(var(--tag-rest))]",
    icon: "💆‍♀️",
  },
  SHOP: {
    id: "shop",
    label: "Shop",
    color: "bg-[hsl(var(--primary))]",
    icon: "🛍️",
  },
};

// Format functions
export const formatDateRange = (start: Date, end: Date): string => {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}`;
};

export const formatDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
};

// Helper function to get days between two dates
export const getDaysBetweenDates = (startDate: Date, endDate: Date): Date[] => {
  const days: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
};

// Helper function to generate trip day pills
export const getTripDayPills = (startDate: Date, endDate: Date): Array<{
  dayNumber: number;
  date: Date;
  label: string;
  value: string;
}> => {
  const days = getDaysBetweenDates(startDate, endDate);

  return days.map((date, index) => ({
    dayNumber: index + 1,
    date,
    label: `Day ${index + 1} - ${formatDate(date)}`,
    value: date.toISOString().split('T')[0]
  }));
};

// Default map settings - centered on continental US
export const DEFAULT_MAP_SETTINGS = {
  center: [-98.5795, 39.8283], // Geographic center of continental US
  zoom: 4, // Zoomed out to show full country
};

// Map style URL
export const MAPBOX_STYLE_URL = "mapbox://styles/mapbox/streets-v12";
