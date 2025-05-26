/**
 * Weather service using OpenWeatherMap API
 */

interface WeatherData {
  date: string;
  condition: string;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  unit: 'C' | 'F';
}

interface OpenWeatherResponse {
  weather: Array<{
    main: string;
    description: string;
  }>;
  main: {
    temp: number;
    humidity: number;
  };
  wind: {
    speed: number;
  };
  dt: number;
}

interface ForecastResponse {
  list: OpenWeatherResponse[];
}

/**
 * Detect preferred temperature unit based on location
 */
function getTemperatureUnit(location: string): 'metric' | 'imperial' {
  const locationLower = location.toLowerCase();
  // Countries that primarily use Fahrenheit
  const fahrenheitCountries = ['united states', 'usa', 'us', 'america', 'belize', 'cayman islands', 'palau'];
  
  if (fahrenheitCountries.some(country => locationLower.includes(country))) {
    return 'imperial';
  }
  
  // Default to Celsius for most of the world
  return 'metric';
}

/**
 * Get current weather for a location
 */
export async function getCurrentWeather(location: string): Promise<WeatherData | null> {
  try {
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    if (!apiKey) {
      console.error("OpenWeatherMap API key not found");
      return null;
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`
    );

    if (!response.ok) {
      console.error("Weather API response not ok:", response.status);
      return null;
    }

    const data: OpenWeatherResponse = await response.json();
    const units = getTemperatureUnit(location);
    
    return {
      date: new Date().toISOString().split('T')[0],
      condition: data.weather[0].main.toLowerCase(),
      temperature: units === 'imperial' ? Math.round(data.main.temp * 9/5 + 32) : Math.round(data.main.temp),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      unit: units === 'imperial' ? 'F' : 'C'
    };
  } catch (error) {
    console.error("Error fetching current weather:", error);
    return null;
  }
}

/**
 * Get weather forecast for multiple dates
 */
export async function getWeatherForecast(location: string, dates: string[]): Promise<WeatherData[]> {
  try {
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    if (!apiKey) {
      console.error("OpenWeatherMap API key not found");
      return [];
    }

    // Get 5-day forecast (free tier limitation)
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`
    );

    if (!response.ok) {
      console.error("Weather forecast API response not ok:", response.status);
      return [];
    }

    const data: ForecastResponse = await response.json();
    
    // Group forecast data by date and get daily summaries
    const dailyForecasts = new Map<string, OpenWeatherResponse[]>();
    
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0];
      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, []);
      }
      dailyForecasts.get(date)!.push(item);
    });

    const weatherData: WeatherData[] = [];
    
    for (const [date, forecasts] of dailyForecasts) {
      // Take the forecast closest to midday for daily summary
      const middayForecast = forecasts.reduce((closest, current) => {
        const currentHour = new Date(current.dt * 1000).getHours();
        const closestHour = new Date(closest.dt * 1000).getHours();
        return Math.abs(currentHour - 12) < Math.abs(closestHour - 12) ? current : closest;
      });

      const units = getTemperatureUnit(location);
      weatherData.push({
        date,
        condition: middayForecast.weather[0].main.toLowerCase(),
        temperature: units === 'imperial' ? Math.round(middayForecast.main.temp * 9/5 + 32) : Math.round(middayForecast.main.temp),
        description: middayForecast.weather[0].description,
        humidity: middayForecast.main.humidity,
        windSpeed: middayForecast.wind.speed,
        unit: units === 'imperial' ? 'F' : 'C'
      });
    }

    return weatherData;
  } catch (error) {
    console.error("Error fetching weather forecast:", error);
    return [];
  }
}

/**
 * Convert weather condition to simplified category for activity suggestions
 */
export function getWeatherCategory(condition: string): string {
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
    return 'rainy';
  }
  if (conditionLower.includes('snow') || conditionLower.includes('blizzard')) {
    return 'cold';
  }
  if (conditionLower.includes('sun') || conditionLower.includes('clear')) {
    return 'sunny';
  }
  if (conditionLower.includes('cloud')) {
    return 'cloudy';
  }
  if (conditionLower.includes('wind')) {
    return 'windy';
  }
  
  return 'mild';
}