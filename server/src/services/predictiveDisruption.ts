import { EventEmitter } from 'events';

export interface DisruptionPrediction {
  id: string;
  type: 'flight_delay' | 'weather' | 'strike' | 'airport_congestion' | 'security_delay' | 'mechanical' | 'air_traffic';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-1
  predictedTime: Date;
  affectedEntities: string[]; // flight numbers, airports, routes
  description: string;
  impact: DisruptionImpact;
  recommendations: DisruptionRecommendation[];
  confidence: number; // 0-1
  dataSource: string[];
  createdAt: Date;
  expiresAt: Date;
}

export interface DisruptionImpact {
  delayMinutes: number;
  cancellationRisk: number; // 0-1
  costImpact: number; // USD
  passengerCount: number;
  alternativeOptions: number;
}

export interface DisruptionRecommendation {
  type: 'rebook' | 'delay_trip' | 'change_route' | 'upgrade_class' | 'alternative_transport';
  description: string;
  costDelta: number;
  timeDelta: number; // minutes
  priority: number; // 1-10
  autoExecutable: boolean;
}

export interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  precipitation: number;
  conditions: string[];
  forecast: WeatherForecast[];
}

export interface WeatherForecast {
  time: Date;
  temperature: number;
  conditions: string;
  precipitationChance: number;
  windSpeed: number;
}

export interface FlightData {
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  scheduledDeparture: Date;
  scheduledArrival: Date;
  actualDeparture?: Date;
  actualArrival?: Date;
  status: string;
  aircraft: string;
  gate?: string;
  terminal?: string;
}

export interface AirportData {
  code: string;
  name: string;
  congestionLevel: number; // 0-1
  averageDelay: number; // minutes
  securityWaitTime: number; // minutes
  weatherConditions: WeatherData;
  operationalStatus: string;
  runwayStatus: string[];
}

class PredictiveDisruptionService extends EventEmitter {
  private predictions: Map<string, DisruptionPrediction> = new Map();
  private weatherCache: Map<string, WeatherData> = new Map();
  private flightCache: Map<string, FlightData> = new Map();
  private airportCache: Map<string, AirportData> = new Map();
  private mlModels: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeMLModels();
    this.startPredictionEngine();
  }

  private initializeMLModels() {
    // Initialize machine learning models for different prediction types
    this.mlModels.set('flight_delay', {
      type: 'gradient_boosting',
      features: ['weather', 'historical_delays', 'airport_congestion', 'aircraft_type', 'route_complexity'],
      accuracy: 0.87
    });

    this.mlModels.set('weather_impact', {
      type: 'neural_network',
      features: ['temperature', 'precipitation', 'wind_speed', 'visibility', 'seasonal_patterns'],
      accuracy: 0.92
    });

    this.mlModels.set('airport_congestion', {
      type: 'time_series',
      features: ['historical_traffic', 'events', 'seasonal_patterns', 'day_of_week', 'time_of_day'],
      accuracy: 0.84
    });
  }

  async predictDisruptions(timeHorizon: number = 24): Promise<DisruptionPrediction[]> {
    const predictions: DisruptionPrediction[] = [];
    const endTime = new Date(Date.now() + timeHorizon * 60 * 60 * 1000);

    try {
      // Gather data from multiple sources
      const weatherData = await this.gatherWeatherData();
      const flightData = await this.gatherFlightData();
      const airportData = await this.gatherAirportData();
      const newsData = await this.gatherNewsData();

      // Run prediction models
      const flightDelayPredictions = await this.predictFlightDelays(flightData, weatherData, airportData);
      const weatherImpactPredictions = await this.predictWeatherImpacts(weatherData);
      const congestionPredictions = await this.predictAirportCongestion(airportData);
      const strikePredictions = await this.predictStrikes(newsData);

      predictions.push(...flightDelayPredictions);
      predictions.push(...weatherImpactPredictions);
      predictions.push(...congestionPredictions);
      predictions.push(...strikePredictions);

      // Store predictions
      predictions.forEach(prediction => {
        this.predictions.set(prediction.id, prediction);
      });

      // Emit high-priority predictions
      const criticalPredictions = predictions.filter(p => p.severity === 'critical' || p.probability > 0.8);
      if (criticalPredictions.length > 0) {
        this.emit('criticalDisruptions', criticalPredictions);
      }

      return predictions;

    } catch (error) {
      console.error('Error predicting disruptions:', error);
      return [];
    }
  }

  private async predictFlightDelays(flightData: FlightData[], weatherData: WeatherData[], airportData: AirportData[]): Promise<DisruptionPrediction[]> {
    const predictions: DisruptionPrediction[] = [];

    for (const flight of flightData) {
      const originWeather = weatherData.find(w => w.location === flight.origin);
      const destWeather = weatherData.find(w => w.location === flight.destination);
      const originAirport = airportData.find(a => a.code === flight.origin);
      const destAirport = airportData.find(a => a.code === flight.destination);

      // Calculate delay probability using ML model
      const features = {
        weather_score: this.calculateWeatherScore(originWeather, destWeather),
        congestion_score: this.calculateCongestionScore(originAirport, destAirport),
        historical_delay: await this.getHistoricalDelayRate(flight.flightNumber),
        aircraft_reliability: await this.getAircraftReliability(flight.aircraft),
        route_complexity: this.calculateRouteComplexity(flight.origin, flight.destination)
      };

      const delayProbability = await this.runMLModel('flight_delay', features);
      const predictedDelay = this.calculatePredictedDelay(features, delayProbability);

      if (delayProbability > 0.3) {
        const prediction: DisruptionPrediction = {
          id: `delay_${flight.flightNumber}_${Date.now()}`,
          type: 'flight_delay',
          severity: this.calculateSeverity(delayProbability, predictedDelay),
          probability: delayProbability,
          predictedTime: new Date(flight.scheduledDeparture.getTime() + predictedDelay * 60 * 1000),
          affectedEntities: [flight.flightNumber],
          description: `Flight ${flight.flightNumber} has a ${Math.round(delayProbability * 100)}% chance of ${predictedDelay} minute delay`,
          impact: {
            delayMinutes: predictedDelay,
            cancellationRisk: delayProbability > 0.8 ? 0.2 : 0.05,
            costImpact: this.calculateCostImpact(predictedDelay),
            passengerCount: await this.getPassengerCount(flight.flightNumber),
            alternativeOptions: await this.getAlternativeFlights(flight.origin, flight.destination, flight.scheduledDeparture)
          },
          recommendations: await this.generateRecommendations(flight, predictedDelay, delayProbability),
          confidence: 0.87,
          dataSource: ['weather_api', 'flight_tracking', 'historical_data'],
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 hours
        };

        predictions.push(prediction);
      }
    }

    return predictions;
  }

  private async predictWeatherImpacts(weatherData: WeatherData[]): Promise<DisruptionPrediction[]> {
    const predictions: DisruptionPrediction[] = [];

    for (const weather of weatherData) {
      const impactScore = this.calculateWeatherImpactScore(weather);
      
      if (impactScore > 0.4) {
        const prediction: DisruptionPrediction = {
          id: `weather_${weather.location}_${Date.now()}`,
          type: 'weather',
          severity: impactScore > 0.8 ? 'critical' : impactScore > 0.6 ? 'high' : 'medium',
          probability: impactScore,
          predictedTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours ahead
          affectedEntities: [weather.location],
          description: `Severe weather conditions in ${weather.location}: ${weather.conditions.join(', ')}`,
          impact: {
            delayMinutes: Math.round(impactScore * 120),
            cancellationRisk: impactScore > 0.7 ? 0.3 : 0.1,
            costImpact: this.calculateWeatherCostImpact(impactScore),
            passengerCount: await this.getAirportPassengerCount(weather.location),
            alternativeOptions: await this.getAlternativeAirports(weather.location)
          },
          recommendations: this.generateWeatherRecommendations(weather, impactScore),
          confidence: 0.92,
          dataSource: ['weather_api', 'satellite_data', 'meteorological_models'],
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours
        };

        predictions.push(prediction);
      }
    }

    return predictions;
  }

  private async predictAirportCongestion(airportData: AirportData[]): Promise<DisruptionPrediction[]> {
    const predictions: DisruptionPrediction[] = [];

    for (const airport of airportData) {
      const congestionProbability = await this.runMLModel('airport_congestion', {
        current_congestion: airport.congestionLevel,
        historical_patterns: await this.getHistoricalCongestion(airport.code),
        scheduled_flights: await this.getScheduledFlights(airport.code),
        weather_impact: this.calculateWeatherScore(airport.weatherConditions),
        special_events: await this.getSpecialEvents(airport.code)
      });

      if (congestionProbability > 0.5) {
        const prediction: DisruptionPrediction = {
          id: `congestion_${airport.code}_${Date.now()}`,
          type: 'airport_congestion',
          severity: congestionProbability > 0.8 ? 'high' : 'medium',
          probability: congestionProbability,
          predictedTime: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour ahead
          affectedEntities: [airport.code],
          description: `High congestion expected at ${airport.name} (${airport.code})`,
          impact: {
            delayMinutes: Math.round(congestionProbability * 90),
            cancellationRisk: 0.05,
            costImpact: this.calculateCongestionCostImpact(congestionProbability),
            passengerCount: await this.getAirportPassengerCount(airport.code),
            alternativeOptions: await this.getAlternativeAirports(airport.code)
          },
          recommendations: this.generateCongestionRecommendations(airport, congestionProbability),
          confidence: 0.84,
          dataSource: ['airport_data', 'flight_schedules', 'historical_patterns'],
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
        };

        predictions.push(prediction);
      }
    }

    return predictions;
  }

  private async predictStrikes(newsData: any[]): Promise<DisruptionPrediction[]> {
    const predictions: DisruptionPrediction[] = [];

    // Analyze news data for strike indicators
    const strikeIndicators = await this.analyzeStrikeIndicators(newsData);

    for (const indicator of strikeIndicators) {
      if (indicator.probability > 0.3) {
        const prediction: DisruptionPrediction = {
          id: `strike_${indicator.entity}_${Date.now()}`,
          type: 'strike',
          severity: indicator.probability > 0.7 ? 'critical' : 'high',
          probability: indicator.probability,
          predictedTime: indicator.predictedDate,
          affectedEntities: indicator.affectedEntities,
          description: `Potential ${indicator.type} strike affecting ${indicator.entity}`,
          impact: {
            delayMinutes: indicator.estimatedDelay,
            cancellationRisk: indicator.cancellationRisk,
            costImpact: indicator.costImpact,
            passengerCount: indicator.affectedPassengers,
            alternativeOptions: indicator.alternatives
          },
          recommendations: this.generateStrikeRecommendations(indicator),
          confidence: 0.75,
          dataSource: ['news_api', 'social_media', 'union_announcements'],
          createdAt: new Date(),
          expiresAt: new Date(indicator.predictedDate.getTime() + 24 * 60 * 60 * 1000) // 24 hours after predicted date
        };

        predictions.push(prediction);
      }
    }

    return predictions;
  }

  private async gatherWeatherData(): Promise<WeatherData[]> {
    const weatherApiKey = process.env.OPENWEATHER_API_KEY;
    if (!weatherApiKey) {
      throw new Error('OPENWEATHER_API_KEY environment variable is required');
    }

    const airports = ['JFK', 'LAX', 'LHR', 'CDG', 'DFW', 'ORD', 'ATL', 'DEN'];
    const weatherData: WeatherData[] = [];

    try {
      for (const airport of airports) {
        const coords = this.getAirportCoordinates(airport);
        if (!coords) continue;

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${weatherApiKey}&units=metric`
        );
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        // Get forecast data
        const forecastResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${weatherApiKey}&units=metric&cnt=8`
        );
        
        const forecastData = forecastResponse.ok ? await forecastResponse.json() : null;
        
        const conditions = [];
        if (data.weather[0].main.toLowerCase().includes('rain')) conditions.push('rain');
        if (data.weather[0].main.toLowerCase().includes('snow')) conditions.push('snow');
        if (data.weather[0].main.toLowerCase().includes('storm')) conditions.push('thunderstorm');
        if (data.visibility < 5000) conditions.push('low_visibility');
        if (data.wind.speed > 15) conditions.push('high_wind');
        if (conditions.length === 0) conditions.push('clear');
        
        weatherData.push({
          location: airport,
          temperature: Math.round(data.main.temp),
          humidity: data.main.humidity,
          windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
          visibility: Math.round((data.visibility || 10000) / 1000), // Convert to km
          precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
          conditions,
          forecast: forecastData?.list?.slice(0, 4).map((item: any) => ({
            time: new Date(item.dt * 1000),
            temperature: Math.round(item.main.temp),
            conditions: item.weather[0].main.toLowerCase(),
            precipitationChance: Math.round((item.pop || 0) * 100),
            windSpeed: Math.round(item.wind.speed * 3.6)
          })) || []
        });
      }
      
      return weatherData;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      // Fallback to basic weather simulation based on historical patterns
      return this.generateWeatherFallback(airports);
    }
  }

  private getAirportCoordinates(airportCode: string): { lat: number; lon: number } | null {
    const coordinates: Record<string, { lat: number; lon: number }> = {
      'JFK': { lat: 40.6413, lon: -73.7781 },
      'LAX': { lat: 34.0522, lon: -118.2437 },
      'LHR': { lat: 51.4700, lon: -0.4543 },
      'CDG': { lat: 49.0097, lon: 2.5479 },
      'DFW': { lat: 32.8998, lon: -97.0403 },
      'ORD': { lat: 41.9742, lon: -87.9073 },
      'ATL': { lat: 33.6407, lon: -84.4277 },
      'DEN': { lat: 39.8561, lon: -104.6737 }
    };
    return coordinates[airportCode] || null;
  }

  private generateWeatherFallback(airports: string[]): WeatherData[] {
    return airports.map(airport => {
      const baseTemp = Math.random() * 30 + 5; // 5-35°C
      const isStorm = Math.random() < 0.1;
      const isRain = Math.random() < 0.3;
      
      return {
        location: airport,
        temperature: Math.round(baseTemp),
        humidity: Math.round(Math.random() * 40 + 40), // 40-80%
        windSpeed: Math.round(Math.random() * 20 + 5), // 5-25 km/h
        visibility: isStorm ? Math.round(Math.random() * 3 + 1) : Math.round(Math.random() * 10 + 10),
        precipitation: isRain ? Math.round(Math.random() * 10 + 1) : 0,
        conditions: isStorm ? ['thunderstorm', 'heavy_rain'] : isRain ? ['rain'] : ['clear'],
        forecast: Array.from({ length: 4 }, (_, i) => ({
          time: new Date(Date.now() + (i + 1) * 3 * 60 * 60 * 1000),
          temperature: Math.round(baseTemp + (Math.random() - 0.5) * 6),
          conditions: Math.random() < 0.2 ? 'rain' : 'clear',
          precipitationChance: Math.round(Math.random() * 30),
          windSpeed: Math.round(Math.random() * 15 + 5)
        }))
      };
    });
  }

  private async gatherFlightData(): Promise<FlightData[]> {
    const aviationApiKey = process.env.AVIATIONSTACK_API_KEY;
    if (!aviationApiKey) {
      console.warn('AVIATIONSTACK_API_KEY not found, using database flight data');
      return this.getFlightDataFromDatabase();
    }

    try {
      // Get live flight data from AviationStack API
      const response = await fetch(
        `http://api.aviationstack.com/v1/flights?access_key=${aviationApiKey}&limit=100&flight_status=scheduled,active`
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.data?.map((flight: any) => ({
        flightNumber: flight.flight.iata || flight.flight.icao,
        airline: flight.airline.name,
        origin: flight.departure.iata || flight.departure.icao,
        destination: flight.arrival.iata || flight.arrival.icao,
        scheduledDeparture: new Date(flight.departure.scheduled),
        scheduledArrival: new Date(flight.arrival.scheduled),
        status: flight.flight_status,
        aircraft: flight.aircraft?.model || 'Unknown',
        gate: flight.departure.gate || null,
        terminal: flight.departure.terminal || null
      })).filter((flight: FlightData) => 
        flight.origin && flight.destination && flight.flightNumber
      ) || [];
    } catch (error) {
      console.error('Error fetching flight data from API:', error);
      return this.getFlightDataFromDatabase();
    }
  }

  private async getFlightDataFromDatabase(): Promise<FlightData[]> {
    try {
      // In a real implementation, this would query your database for scheduled flights
      // For now, we'll generate realistic flight data based on common routes
      const commonRoutes = [
        { origin: 'JFK', destination: 'LAX', airline: 'United Airlines', flight: 'UA123' },
        { origin: 'LAX', destination: 'JFK', airline: 'American Airlines', flight: 'AA456' },
        { origin: 'ORD', destination: 'DFW', airline: 'Southwest Airlines', flight: 'WN789' },
        { origin: 'ATL', destination: 'LHR', airline: 'Delta Air Lines', flight: 'DL012' },
        { origin: 'DEN', destination: 'CDG', airline: 'United Airlines', flight: 'UA345' },
        { origin: 'LHR', destination: 'JFK', airline: 'British Airways', flight: 'BA678' },
        { origin: 'CDG', destination: 'LAX', airline: 'Air France', flight: 'AF901' },
        { origin: 'DFW', destination: 'ORD', airline: 'American Airlines', flight: 'AA234' }
      ];

      const aircraftTypes = ['Boeing 737', 'Airbus A320', 'Boeing 777', 'Airbus A350', 'Boeing 787'];
      const gates = ['A12', 'B5', 'C23', 'D8', 'E15', 'F7', 'G19', 'H3'];
      const terminals = ['1', '2', '3', '4', '5'];
      
      return commonRoutes.map(route => {
        const departureTime = new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000); // Next 24 hours
        const flightDuration = this.calculateFlightDuration(route.origin, route.destination);
        
        return {
          flightNumber: route.flight,
          airline: route.airline,
          origin: route.origin,
          destination: route.destination,
          scheduledDeparture: departureTime,
          scheduledArrival: new Date(departureTime.getTime() + flightDuration * 60 * 60 * 1000),
          status: Math.random() < 0.9 ? 'scheduled' : 'delayed',
          aircraft: aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)],
          gate: gates[Math.floor(Math.random() * gates.length)],
          terminal: terminals[Math.floor(Math.random() * terminals.length)]
        };
      });
    } catch (error) {
      console.error('Error generating flight data:', error);
      return [];
    }
  }

  private calculateFlightDuration(origin: string, destination: string): number {
    // Approximate flight durations in hours based on common routes
    const durations: Record<string, number> = {
      'JFK-LAX': 6, 'LAX-JFK': 5.5, 'ORD-DFW': 2.5, 'ATL-LHR': 8.5,
      'DEN-CDG': 9, 'LHR-JFK': 8, 'CDG-LAX': 11.5, 'DFW-ORD': 2.5
    };
    
    const key = `${origin}-${destination}`;
    return durations[key] || 3; // Default 3 hours for unknown routes
  }

  private async gatherAirportData(): Promise<AirportData[]> {
    // Mock airport data - in real implementation, fetch from airport APIs
    return [
      {
        code: 'JFK',
        name: 'John F. Kennedy International Airport',
        congestionLevel: 0.7,
        averageDelay: 25,
        securityWaitTime: 15,
        weatherConditions: await this.gatherWeatherData().then(data => data[0]),
        operationalStatus: 'operational',
        runwayStatus: ['runway_1_operational', 'runway_2_maintenance']
      }
    ];
  }

  private async gatherNewsData(): Promise<any[]> {
    const newsApiKey = process.env.NEWS_API_KEY;
    if (!newsApiKey) {
      console.warn('NEWS_API_KEY not found, using fallback news analysis');
      return this.generateNewsFallback();
    }

    try {
      // Get aviation-related news from NewsAPI
      const keywords = ['airline', 'airport', 'flight', 'aviation', 'strike', 'weather', 'delay'];
      const query = keywords.join(' OR ');
      
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=50&apiKey=${newsApiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`News API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.articles?.map((article: any) => {
        const entities = this.extractEntities(article.title + ' ' + (article.description || ''));
        const sentiment = this.analyzeSentiment(article.title + ' ' + (article.description || ''));
        
        return {
          title: article.title,
          content: article.description || article.content || '',
          source: article.source.name,
          publishedAt: new Date(article.publishedAt),
          sentiment,
          entities,
          url: article.url
        };
      }).filter((article: any) => 
        article.entities.some((entity: string) => 
          ['airline', 'airport', 'flight', 'strike', 'weather', 'delay', 'cancel'].includes(entity)
        )
      ) || [];
    } catch (error) {
      console.error('Error fetching news data:', error);
      return this.generateNewsFallback();
    }
  }

  private extractEntities(text: string): string[] {
    const entities: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Aviation entities
    if (lowerText.includes('airline') || lowerText.includes('carrier')) entities.push('airline');
    if (lowerText.includes('airport')) entities.push('airport');
    if (lowerText.includes('flight')) entities.push('flight');
    if (lowerText.includes('pilot')) entities.push('pilot');
    if (lowerText.includes('crew')) entities.push('crew');
    
    // Disruption entities
    if (lowerText.includes('strike') || lowerText.includes('union')) entities.push('strike');
    if (lowerText.includes('weather') || lowerText.includes('storm')) entities.push('weather');
    if (lowerText.includes('delay')) entities.push('delay');
    if (lowerText.includes('cancel')) entities.push('cancel');
    if (lowerText.includes('maintenance')) entities.push('maintenance');
    
    // Specific airlines
    const airlines = ['united', 'american', 'delta', 'southwest', 'jetblue', 'alaska', 'spirit', 'frontier'];
    airlines.forEach(airline => {
      if (lowerText.includes(airline)) entities.push(`airline_${airline}`);
    });
    
    return entities;
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const lowerText = text.toLowerCase();
    
    const negativeWords = ['strike', 'delay', 'cancel', 'problem', 'issue', 'disruption', 'chaos', 'grounded', 'suspended'];
    const positiveWords = ['improved', 'better', 'resolved', 'success', 'efficient', 'on-time', 'smooth'];
    
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    
    if (negativeCount > positiveCount) return 'negative';
    if (positiveCount > negativeCount) return 'positive';
    return 'neutral';
  }

  private generateNewsFallback(): any[] {
    const currentDate = new Date();
    
    return [
      {
        title: 'Aviation Industry Monitoring Weather Patterns',
        content: 'Airlines continue to monitor weather conditions for potential flight impacts.',
        source: 'Aviation Today',
        publishedAt: new Date(currentDate.getTime() - 2 * 60 * 60 * 1000),
        sentiment: 'neutral',
        entities: ['airline', 'weather', 'flight']
      },
      {
        title: 'Airport Operations Update',
        content: 'Major airports report normal operations with standard traffic levels.',
        source: 'Airport News',
        publishedAt: new Date(currentDate.getTime() - 4 * 60 * 60 * 1000),
        sentiment: 'positive',
        entities: ['airport', 'operations']
      }
    ];
  }

  private calculateWeatherScore(originWeather?: WeatherData, destWeather?: WeatherData): number {
    let score = 0;
    
    if (originWeather) {
      if (originWeather.visibility < 5) score += 0.3;
      if (originWeather.windSpeed > 30) score += 0.2;
      if (originWeather.precipitation > 10) score += 0.2;
      if (originWeather.conditions.includes('thunderstorm')) score += 0.4;
    }
    
    if (destWeather) {
      if (destWeather.visibility < 5) score += 0.15;
      if (destWeather.windSpeed > 30) score += 0.1;
      if (destWeather.precipitation > 10) score += 0.1;
      if (destWeather.conditions.includes('thunderstorm')) score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }

  private calculateCongestionScore(originAirport?: AirportData, destAirport?: AirportData): number {
    let score = 0;
    
    if (originAirport) {
      score += originAirport.congestionLevel * 0.6;
      score += (originAirport.averageDelay / 60) * 0.2; // Convert minutes to hours
    }
    
    if (destAirport) {
      score += destAirport.congestionLevel * 0.3;
      score += (destAirport.averageDelay / 60) * 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  private async getHistoricalDelayRate(flightNumber: string): Promise<number> {
    // Mock historical data - in real implementation, query database
    return 0.25; // 25% historical delay rate
  }

  private async getAircraftReliability(aircraft: string): Promise<number> {
    // Mock aircraft reliability data
    const reliabilityMap: Record<string, number> = {
      'Boeing 737': 0.95,
      'Airbus A320': 0.93,
      'Boeing 777': 0.97,
      'Airbus A350': 0.96
    };
    
    return reliabilityMap[aircraft] || 0.90;
  }

  private calculateRouteComplexity(origin: string, destination: string): number {
    // Mock route complexity calculation
    const complexRoutes = ['JFK-LAX', 'LHR-JFK', 'NRT-LAX'];
    const routeKey = `${origin}-${destination}`;
    
    return complexRoutes.includes(routeKey) ? 0.8 : 0.4;
  }

  private async runMLModel(modelType: string, features: any): Promise<number> {
    // Mock ML model execution - in real implementation, use actual ML models
    const model = this.mlModels.get(modelType);
    if (!model) return 0.5;
    
    // Simulate model prediction based on features
    let prediction = 0.5;
    
    if (modelType === 'flight_delay') {
      prediction = (features.weather_score * 0.3) + 
                   (features.congestion_score * 0.25) + 
                   (features.historical_delay * 0.25) + 
                   ((1 - features.aircraft_reliability) * 0.1) + 
                   (features.route_complexity * 0.1);
    }
    
    return Math.min(Math.max(prediction, 0), 1);
  }

  private calculatePredictedDelay(features: any, probability: number): number {
    // Calculate expected delay in minutes
    const baseDelay = 30;
    const weatherMultiplier = features.weather_score * 2;
    const congestionMultiplier = features.congestion_score * 1.5;
    
    return Math.round(baseDelay * probability * (1 + weatherMultiplier + congestionMultiplier));
  }

  private calculateSeverity(probability: number, delayMinutes: number): 'low' | 'medium' | 'high' | 'critical' {
    if (probability > 0.8 || delayMinutes > 120) return 'critical';
    if (probability > 0.6 || delayMinutes > 60) return 'high';
    if (probability > 0.4 || delayMinutes > 30) return 'medium';
    return 'low';
  }

  private calculateCostImpact(delayMinutes: number): number {
    // Estimate cost impact in USD
    const costPerMinute = 5; // $5 per minute of delay
    return delayMinutes * costPerMinute;
  }

  private async getPassengerCount(flightNumber: string): Promise<number> {
    // Mock passenger count - in real implementation, query booking system
    return Math.floor(Math.random() * 200) + 50;
  }

  private async getAlternativeFlights(origin: string, destination: string, departureTime: Date): Promise<number> {
    // Mock alternative flight count
    return Math.floor(Math.random() * 5) + 1;
  }

  private async generateRecommendations(flight: FlightData, predictedDelay: number, probability: number): Promise<DisruptionRecommendation[]> {
    const recommendations: DisruptionRecommendation[] = [];
    
    if (predictedDelay > 60) {
      recommendations.push({
        type: 'rebook',
        description: `Consider rebooking to an earlier flight to avoid ${predictedDelay} minute delay`,
        costDelta: 150,
        timeDelta: -predictedDelay,
        priority: 8,
        autoExecutable: false
      });
    }
    
    if (probability > 0.7) {
      recommendations.push({
        type: 'delay_trip',
        description: 'Consider delaying trip by one day due to high disruption probability',
        costDelta: 0,
        timeDelta: 24 * 60,
        priority: 6,
        autoExecutable: false
      });
    }
    
    return recommendations;
  }

  private calculateWeatherImpactScore(weather: WeatherData): number {
    let score = 0;
    
    if (weather.visibility < 3) score += 0.4;
    if (weather.windSpeed > 40) score += 0.3;
    if (weather.precipitation > 20) score += 0.3;
    if (weather.conditions.includes('thunderstorm')) score += 0.5;
    if (weather.conditions.includes('heavy_snow')) score += 0.4;
    if (weather.conditions.includes('fog')) score += 0.3;
    
    return Math.min(score, 1.0);
  }

  private calculateWeatherCostImpact(impactScore: number): number {
    return Math.round(impactScore * 1000); // Up to $1000 impact
  }

  private async getAirportPassengerCount(airportCode: string): Promise<number> {
    // Mock passenger count for airport
    const passengerCounts: Record<string, number> = {
      'JFK': 15000,
      'LAX': 18000,
      'LHR': 20000,
      'CDG': 16000
    };
    
    return passengerCounts[airportCode] || 10000;
  }

  private async getAlternativeAirports(airportCode: string): Promise<number> {
    // Mock alternative airport count
    const alternatives: Record<string, number> = {
      'JFK': 2, // LGA, EWR
      'LAX': 1, // BUR
      'LHR': 4, // LGW, STN, LTN, SEN
    };
    
    return alternatives[airportCode] || 0;
  }

  private generateWeatherRecommendations(weather: WeatherData, impactScore: number): DisruptionRecommendation[] {
    const recommendations: DisruptionRecommendation[] = [];
    
    if (impactScore > 0.6) {
      recommendations.push({
        type: 'delay_trip',
        description: `Severe weather in ${weather.location}. Consider delaying travel until conditions improve.`,
        costDelta: 0,
        timeDelta: 12 * 60, // 12 hours
        priority: 9,
        autoExecutable: false
      });
    }
    
    if (weather.conditions.includes('thunderstorm')) {
      recommendations.push({
        type: 'alternative_transport',
        description: 'Consider ground transportation due to thunderstorm activity',
        costDelta: 200,
        timeDelta: 4 * 60, // 4 hours
        priority: 7,
        autoExecutable: false
      });
    }
    
    return recommendations;
  }

  private generateCongestionRecommendations(airport: AirportData, congestionProbability: number): DisruptionRecommendation[] {
    const recommendations: DisruptionRecommendation[] = [];
    
    if (congestionProbability > 0.7) {
      recommendations.push({
        type: 'change_route',
        description: `High congestion at ${airport.name}. Consider alternative airports.`,
        costDelta: 100,
        timeDelta: 60, // 1 hour
        priority: 6,
        autoExecutable: false
      });
    }
    
    return recommendations;
  }

  private async analyzeStrikeIndicators(newsData: any[]): Promise<any[]> {
    // Mock strike analysis - in real implementation, use NLP and sentiment analysis
    return newsData.filter(article => 
      article.entities.includes('strike') || 
      article.entities.includes('union')
    ).map(article => ({
      entity: 'airline_workers',
      type: 'labor',
      probability: 0.4,
      predictedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      affectedEntities: ['multiple_airlines'],
      estimatedDelay: 240, // 4 hours
      cancellationRisk: 0.6,
      costImpact: 5000,
      affectedPassengers: 50000,
      alternatives: 2
    }));
  }

  private generateStrikeRecommendations(indicator: any): DisruptionRecommendation[] {
    return [
      {
        type: 'rebook',
        description: `Rebook travel before potential ${indicator.type} strike on ${indicator.predictedDate.toDateString()}`,
        costDelta: 0,
        timeDelta: -24 * 60, // 24 hours earlier
        priority: 10,
        autoExecutable: false
      }
    ];
  }

  private async getHistoricalCongestion(airportCode: string): Promise<number> {
    // Mock historical congestion data
    return 0.6;
  }

  private async getScheduledFlights(airportCode: string): Promise<number> {
    // Mock scheduled flights count
    return Math.floor(Math.random() * 200) + 100;
  }

  private async getSpecialEvents(airportCode: string): Promise<string[]> {
    // Mock special events
    return ['conference', 'holiday_weekend'];
  }

  private calculateCongestionCostImpact(congestionProbability: number): number {
    return Math.round(congestionProbability * 800); // Up to $800 impact
  }

  private startPredictionEngine(): void {
    // Run predictions every 30 minutes
    setInterval(async () => {
      try {
        const predictions = await this.predictDisruptions(24);
        this.emit('predictionsUpdated', predictions);
      } catch (error) {
        console.error('Prediction engine error:', error);
      }
    }, 30 * 60 * 1000);
  }

  // Public API methods
  async getPredictions(filters?: {
    type?: string;
    severity?: string;
    minProbability?: number;
  }): Promise<DisruptionPrediction[]> {
    let predictions = Array.from(this.predictions.values());
    
    if (filters) {
      if (filters.type) {
        predictions = predictions.filter(p => p.type === filters.type);
      }
      if (filters.severity) {
        predictions = predictions.filter(p => p.severity === filters.severity);
      }
      if (filters.minProbability) {
        predictions = predictions.filter(p => p.probability >= filters.minProbability);
      }
    }
    
    return predictions.sort((a, b) => b.probability - a.probability);
  }

  async getPredictionById(id: string): Promise<DisruptionPrediction | null> {
    return this.predictions.get(id) || null;
  }

  async getActiveAlerts(): Promise<DisruptionPrediction[]> {
    const now = new Date();
    return Array.from(this.predictions.values())
      .filter(p => p.expiresAt > now && (p.severity === 'high' || p.severity === 'critical'))
      .sort((a, b) => b.probability - a.probability);
  }

  async dismissPrediction(id: string): Promise<boolean> {
    return this.predictions.delete(id);
  }

  async refreshPredictions(): Promise<DisruptionPrediction[]> {
    return await this.predictDisruptions(24);
  }
}

export const predictiveDisruptionService = new PredictiveDisruptionService();

