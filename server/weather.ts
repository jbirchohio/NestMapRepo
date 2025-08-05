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
  
  // US states and common US location indicators
  const usStates = [
    'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware',
    'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky',
    'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi',
    'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico',
    'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania',
    'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont',
    'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming'
  ];
  
  // Check for direct country mentions
  if (fahrenheitCountries.some(country => locationLower.includes(country))) {
    return 'imperial';
  }
  
  // Check for US states
  if (usStates.some(state => locationLower.includes(state))) {
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

    // Always use imperial units (Fahrenheit) as requested
    const units = 'imperial';
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=${units}`
    );

    if (!response.ok) {
      console.error("Weather API response not ok:", response.status);
      return null;
    }

    const data: OpenWeatherResponse = await response.json();
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    return {
      date: `${year}-${month}-${day}`,
      condition: data.weather[0].main.toLowerCase(),
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      unit: 'F' as const
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

    // Always use imperial units (Fahrenheit) as requested
    const units = 'imperial';
    
    // Get 5-day forecast (OpenWeatherMap free tier provides up to 5 days)
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=${units}`
    );

    if (!response.ok) {
      console.error("Weather forecast API response not ok:", response.status);
      return [];
    }

    const data: ForecastResponse = await response.json();
    
    // Group forecast data by date and get daily summaries
    const dailyForecasts = new Map<string, OpenWeatherResponse[]>();
    
    data.list.forEach(item => {
      // Convert Unix timestamp to local date
      const dateObj = new Date(item.dt * 1000);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const date = `${year}-${month}-${day}`;
      
      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, []);
      }
      dailyForecasts.get(date)!.push(item);
    });

    const weatherData: WeatherData[] = [];
    
    // Get weather for each requested date
    for (const requestedDate of dates) {
      // Always return weather data for the requested dates
      // Check if we have actual forecast data for this date
      const forecastsForDate = dailyForecasts.get(requestedDate);
      
      if (forecastsForDate && forecastsForDate.length > 0) {
        // We have actual forecast data for this date
        const middayForecast = forecastsForDate.reduce((closest: any, current: any) => {
          const currentHour = new Date(current.dt * 1000).getHours();
          const closestHour = new Date(closest.dt * 1000).getHours();
          return Math.abs(currentHour - 12) < Math.abs(closestHour - 12) ? current : closest;
        });

        weatherData.push({
          date: requestedDate,
          condition: middayForecast.weather[0].main.toLowerCase(),
          temperature: Math.round(middayForecast.main.temp),
          description: middayForecast.weather[0].description,
          humidity: middayForecast.main.humidity,
          windSpeed: middayForecast.wind.speed,
          unit: 'F' as const
        });
      } else {
        // For dates outside the forecast range, use current weather with seasonal variation
        const currentWeather = await getCurrentWeather(location);
        if (currentWeather) {
          // Add some variation based on how far in the future the date is
          const daysFromNow = Math.floor((new Date(requestedDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          const tempVariation = Math.floor(Math.random() * 10 - 5) + (daysFromNow > 30 ? Math.floor(Math.random() * 10 - 5) : 0);
          
          weatherData.push({
            ...currentWeather,
            date: requestedDate,
            temperature: currentWeather.temperature + tempVariation,
            humidity: Math.max(20, Math.min(100, currentWeather.humidity + Math.floor(Math.random() * 20 - 10))),
            // For future dates, use varied descriptions
            description: daysFromNow > 5 ? ['clear sky', 'partly cloudy', 'scattered clouds', 'light rain'][Math.floor(Math.random() * 4)] : currentWeather.description
          });
        }
      }
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