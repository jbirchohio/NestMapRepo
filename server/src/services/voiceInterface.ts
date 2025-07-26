import { EventEmitter } from 'events';

export interface VoiceCommand {
  id: string;
  command: string;
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  userId: number;
  timestamp: Date;
}

export interface VoiceResponse {
  id: string;
  text: string;
  audio?: Buffer;
  actions?: VoiceAction[];
  followUp?: string;
}

export interface VoiceAction {
  type: 'book_flight' | 'book_hotel' | 'create_trip' | 'modify_booking' | 'get_info' | 'navigate';
  parameters: Record<string, any>;
  requiresConfirmation: boolean;
}

export interface VoiceSession {
  id: string;
  userId: number;
  context: Record<string, any>;
  history: VoiceCommand[];
  isActive: boolean;
  startTime: Date;
  lastActivity: Date;
}

class VoiceInterfaceService extends EventEmitter {
  private sessions: Map<string, VoiceSession> = new Map();
  private intents: Map<string, (command: VoiceCommand) => Promise<VoiceResponse>> = new Map();
  private speechToTextProvider: string = 'openai-whisper';
  private textToSpeechProvider: string = 'openai-tts';

  constructor() {
    super();
    this.initializeIntents();
  }

  private initializeIntents() {
    // Travel booking intents
    this.intents.set('book_flight', this.handleFlightBooking.bind(this));
    this.intents.set('book_hotel', this.handleHotelBooking.bind(this));
    this.intents.set('create_trip', this.handleTripCreation.bind(this));
    this.intents.set('modify_booking', this.handleBookingModification.bind(this));
    
    // Information intents
    this.intents.set('get_trip_info', this.handleTripInfo.bind(this));
    this.intents.set('get_weather', this.handleWeatherInfo.bind(this));
    this.intents.set('get_flight_status', this.handleFlightStatus.bind(this));
    this.intents.set('get_recommendations', this.handleRecommendations.bind(this));
    
    // Navigation intents
    this.intents.set('navigate_to', this.handleNavigation.bind(this));
    this.intents.set('show_dashboard', this.handleDashboardNavigation.bind(this));
    this.intents.set('open_expenses', this.handleExpenseNavigation.bind(this));
    
    // Utility intents
    this.intents.set('help', this.handleHelp.bind(this));
    this.intents.set('cancel', this.handleCancel.bind(this));
    this.intents.set('confirm', this.handleConfirm.bind(this));
  }

  async processVoiceCommand(audioBuffer: Buffer, userId: number, sessionId?: string): Promise<VoiceResponse> {
    try {
      // Convert speech to text
      const transcript = await this.speechToText(audioBuffer);
      
      // Process natural language understanding
      const command = await this.processNLU(transcript, userId, sessionId);
      
      // Get or create session
      const session = await this.getOrCreateSession(sessionId || this.generateSessionId(), userId);
      session.history.push(command);
      session.lastActivity = new Date();
      
      // Process intent
      const response = await this.processIntent(command, session);
      
      // Generate audio response if needed
      if (response.text) {
        response.audio = await this.textToSpeech(response.text);
      }
      
      this.emit('voiceCommand', { command, response, session });
      return response;
      
    } catch (error) {
      console.error('Voice command processing error:', error);
      return {
        id: this.generateId(),
        text: "I'm sorry, I couldn't understand that. Could you please try again?",
        audio: await this.textToSpeech("I'm sorry, I couldn't understand that. Could you please try again?")
      };
    }
  }

  async processTextCommand(text: string, userId: number, sessionId?: string): Promise<VoiceResponse> {
    try {
      const command = await this.processNLU(text, userId, sessionId);
      const session = await this.getOrCreateSession(sessionId || this.generateSessionId(), userId);
      session.history.push(command);
      session.lastActivity = new Date();
      
      const response = await this.processIntent(command, session);
      
      if (response.text) {
        response.audio = await this.textToSpeech(response.text);
      }
      
      this.emit('textCommand', { command, response, session });
      return response;
      
    } catch (error) {
      console.error('Text command processing error:', error);
      return {
        id: this.generateId(),
        text: "I'm sorry, I couldn't process that request. Could you please try again?",
        audio: await this.textToSpeech("I'm sorry, I couldn't process that request. Could you please try again?")
      };
    }
  }

  private async speechToText(audioBuffer: Buffer): Promise<string> {
    // Integration with OpenAI Whisper or other STT service
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'multipart/form-data'
      },
      body: this.createFormData(audioBuffer)
    });
    
    const result = await response.json();
    return result.text || '';
  }

  private async textToSpeech(text: string): Promise<Buffer> {
    // Integration with OpenAI TTS or other TTS service
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'alloy'
      })
    });
    
    return Buffer.from(await response.arrayBuffer());
  }

  private async processNLU(text: string, userId: number, sessionId?: string): Promise<VoiceCommand> {
    // Advanced NLU processing with OpenAI or custom models
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a travel assistant NLU processor. Extract intent and entities from user commands.
            
            Available intents: book_flight, book_hotel, create_trip, modify_booking, get_trip_info, get_weather, get_flight_status, get_recommendations, navigate_to, show_dashboard, open_expenses, help, cancel, confirm
            
            Return JSON with: intent, entities, confidence (0-1)
            
            Example: "Book a flight to London tomorrow" -> {"intent": "book_flight", "entities": {"destination": "London", "date": "tomorrow"}, "confidence": 0.95}`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1
      })
    });
    
    const result = await response.json();
    const nluResult = JSON.parse(result.choices[0].message.content);
    
    return {
      id: this.generateId(),
      command: text,
      intent: nluResult.intent,
      entities: nluResult.entities || {},
      confidence: nluResult.confidence || 0.5,
      userId,
      timestamp: new Date()
    };
  }

  private async processIntent(command: VoiceCommand, session: VoiceSession): Promise<VoiceResponse> {
    const handler = this.intents.get(command.intent);
    if (!handler) {
      return {
        id: this.generateId(),
        text: `I don't know how to handle "${command.intent}". Try asking for help to see what I can do.`,
        followUp: "Say 'help' to see available commands."
      };
    }
    
    return await handler(command);
  }

  private async handleFlightBooking(command: VoiceCommand): Promise<VoiceResponse> {
    const { entities } = command;
    const { destination, origin, date, returnDate, passengers, class: travelClass } = entities;
    
    if (!destination) {
      return {
        id: this.generateId(),
        text: "Where would you like to fly to?",
        followUp: "Please specify your destination."
      };
    }
    
    const actions: VoiceAction[] = [{
      type: 'book_flight',
      parameters: {
        destination,
        origin: origin || 'current_location',
        departureDate: date || 'flexible',
        returnDate: returnDate || null,
        passengers: passengers || 1,
        class: travelClass || 'economy'
      },
      requiresConfirmation: true
    }];
    
    let responseText = `I'll help you book a flight to ${destination}`;
    if (date) responseText += ` on ${date}`;
    if (returnDate) responseText += ` returning ${returnDate}`;
    responseText += `. Let me search for the best options.`;
    
    return {
      id: this.generateId(),
      text: responseText,
      actions,
      followUp: "Say 'confirm' to proceed with the booking or 'modify' to change details."
    };
  }

  private async handleHotelBooking(command: VoiceCommand): Promise<VoiceResponse> {
    const { entities } = command;
    const { location, checkIn, checkOut, guests, rooms, budget } = entities;
    
    if (!location) {
      return {
        id: this.generateId(),
        text: "Where would you like to stay?",
        followUp: "Please specify the city or hotel location."
      };
    }
    
    const actions: VoiceAction[] = [{
      type: 'book_hotel',
      parameters: {
        location,
        checkInDate: checkIn || 'flexible',
        checkOutDate: checkOut || 'flexible',
        guests: guests || 1,
        rooms: rooms || 1,
        budget: budget || null
      },
      requiresConfirmation: true
    }];
    
    let responseText = `I'll help you book a hotel in ${location}`;
    if (checkIn) responseText += ` from ${checkIn}`;
    if (checkOut) responseText += ` to ${checkOut}`;
    responseText += `. Searching for the best accommodations.`;
    
    return {
      id: this.generateId(),
      text: responseText,
      actions,
      followUp: "Say 'confirm' to proceed or 'show options' to see available hotels."
    };
  }

  private async handleTripCreation(command: VoiceCommand): Promise<VoiceResponse> {
    const { entities } = command;
    const { destination, startDate, endDate, purpose, budget } = entities;
    
    const actions: VoiceAction[] = [{
      type: 'create_trip',
      parameters: {
        destination: destination || 'to be determined',
        startDate: startDate || 'flexible',
        endDate: endDate || 'flexible',
        purpose: purpose || 'business',
        budget: budget || null
      },
      requiresConfirmation: true
    }];
    
    let responseText = "I'll help you create a new trip";
    if (destination) responseText += ` to ${destination}`;
    if (purpose) responseText += ` for ${purpose}`;
    responseText += ". Let me gather the details and create your itinerary.";
    
    return {
      id: this.generateId(),
      text: responseText,
      actions,
      followUp: "I'll need some more details. What's your preferred travel dates and budget?"
    };
  }

  private async handleBookingModification(command: VoiceCommand): Promise<VoiceResponse> {
    const { entities } = command;
    const { bookingId, changeType, newValue } = entities;
    
    if (!bookingId && !changeType) {
      return {
        id: this.generateId(),
        text: "What booking would you like to modify? You can say 'change my flight' or 'modify hotel reservation'.",
        followUp: "Please specify which booking you'd like to change."
      };
    }
    
    const actions: VoiceAction[] = [{
      type: 'modify_booking',
      parameters: {
        bookingId: bookingId || 'latest',
        changeType: changeType || 'general',
        newValue: newValue || null
      },
      requiresConfirmation: true
    }];
    
    return {
      id: this.generateId(),
      text: `I'll help you modify your ${changeType || 'booking'}. Let me pull up the details.`,
      actions,
      followUp: "What changes would you like to make?"
    };
  }

  private async handleTripInfo(command: VoiceCommand): Promise<VoiceResponse> {
    const { entities } = command;
    const { tripId, infoType } = entities;
    
    // Get real trip information from database
    const tripInfo = await this.getTripInformation(tripId);
    
    let responseText = "Here's your trip information: ";
    if (infoType === 'flights') {
      responseText += `Your flight is ${tripInfo.flights}`;
    } else if (infoType === 'hotel') {
      responseText += `You're staying at ${tripInfo.hotel}`;
    } else {
      responseText += `Trip to ${tripInfo.destination} from ${tripInfo.dates}. ${tripInfo.status}.`;
    }
    
    return {
      id: this.generateId(),
      text: responseText,
      followUp: "Would you like more details about any part of your trip?"
    };
  }

  private async handleWeatherInfo(command: VoiceCommand): Promise<VoiceResponse> {
    const { entities } = command;
    const { location, date } = entities;
    
    if (!location) {
      return {
        id: this.generateId(),
        text: "Which location would you like weather information for?",
        followUp: "Please specify a city or destination."
      };
    }
    
    // Get real weather data from API
    const weather = await this.getWeatherData(location, date);
    
    let responseText = `The weather in ${weather.location} is ${weather.temperature} and ${weather.condition}`;
    if (date) responseText += ` for ${date}`;
    if (weather.forecast) responseText += `. ${weather.forecast}`;
    
    return {
      id: this.generateId(),
      text: responseText,
      followUp: "Would you like me to suggest what to pack or any weather-related travel tips?"
    };
  }

  private async handleFlightStatus(command: VoiceCommand): Promise<VoiceResponse> {
    const { entities } = command;
    const { flightNumber, date } = entities;
    
    if (!flightNumber) {
      return {
        id: this.generateId(),
        text: "Which flight would you like status for? You can say the flight number or 'my next flight'.",
        followUp: "Please provide a flight number or reference."
      };
    }
    
    // Get real flight status from API
    const flightStatus = await this.getFlightStatus(flightNumber, date);
    
    let responseText = `Flight ${flightStatus.flight} is ${flightStatus.status}`;
    if (flightStatus.delay) {
      responseText += ` with a ${flightStatus.delay} delay`;
    }
    responseText += `. Departure at ${flightStatus.departure}`;
    if (flightStatus.gate) responseText += ` from gate ${flightStatus.gate}`;
    
    return {
      id: this.generateId(),
      text: responseText,
      followUp: "Would you like me to set up notifications for any status changes?"
    };
  }

  private async handleRecommendations(command: VoiceCommand): Promise<VoiceResponse> {
    const { entities } = command;
    const { type, location, budget, preferences } = entities;
    
    const recommendationType = type || 'general';
    const targetLocation = location || 'your destination';
    
    // Get real recommendations using AI and location data
    const recommendations = await this.getLocationRecommendations(targetLocation, recommendationType, budget, preferences);
    
    let responseText = `Here are my ${recommendationType} recommendations for ${targetLocation}: `;
    
    if (recommendationType === 'restaurants' || recommendationType === 'dining') {
      responseText += recommendations.restaurants.join(', ');
    } else if (recommendationType === 'activities' || recommendationType === 'things to do') {
      responseText += recommendations.activities.join(', ');
    } else if (recommendationType === 'hotels' || recommendationType === 'accommodation') {
      responseText += recommendations.hotels.join(', ');
    } else {
      responseText += `Top restaurants: ${recommendations.restaurants.slice(0, 2).join(', ')}. Activities: ${recommendations.activities.slice(0, 2).join(', ')}.`;
    }
    
    return {
      id: this.generateId(),
      text: responseText,
      followUp: "Would you like more details about any of these recommendations or help with booking?"
    };
  }

  private async handleNavigation(command: VoiceCommand): Promise<VoiceResponse> {
    const { entities } = command;
    const { destination, page } = entities;
    
    const actions: VoiceAction[] = [{
      type: 'navigate',
      parameters: {
        destination: destination || page || 'dashboard'
      },
      requiresConfirmation: false
    }];
    
    return {
      id: this.generateId(),
      text: `Navigating to ${destination || page || 'dashboard'}.`,
      actions
    };
  }

  private async handleDashboardNavigation(command: VoiceCommand): Promise<VoiceResponse> {
    const actions: VoiceAction[] = [{
      type: 'navigate',
      parameters: { destination: 'dashboard' },
      requiresConfirmation: false
    }];
    
    return {
      id: this.generateId(),
      text: "Opening your dashboard.",
      actions
    };
  }

  private async handleExpenseNavigation(command: VoiceCommand): Promise<VoiceResponse> {
    const actions: VoiceAction[] = [{
      type: 'navigate',
      parameters: { destination: 'expenses' },
      requiresConfirmation: false
    }];
    
    return {
      id: this.generateId(),
      text: "Opening your expenses.",
      actions
    };
  }

  private async handleHelp(command: VoiceCommand): Promise<VoiceResponse> {
    const helpText = `I can help you with:
    
    • Booking flights and hotels
    • Creating and managing trips
    • Getting travel information and weather
    • Checking flight status
    • Finding recommendations
    • Navigating the app
    • Managing expenses
    
    Just speak naturally, like "Book a flight to London" or "What's the weather in Paris?"`;
    
    return {
      id: this.generateId(),
      text: helpText,
      followUp: "What would you like to do?"
    };
  }

  private async handleCancel(command: VoiceCommand): Promise<VoiceResponse> {
    return {
      id: this.generateId(),
      text: "Okay, I've cancelled that action. What else can I help you with?",
      followUp: "Say 'help' to see what I can do."
    };
  }

  private async handleConfirm(command: VoiceCommand): Promise<VoiceResponse> {
    return {
      id: this.generateId(),
      text: "Great! I'll proceed with that action.",
      followUp: "I'll let you know when it's complete."
    };
  }

  private async getOrCreateSession(sessionId: string, userId: number): Promise<VoiceSession> {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }
    
    const session: VoiceSession = {
      id: sessionId,
      userId,
      context: {},
      history: [],
      isActive: true,
      startTime: new Date(),
      lastActivity: new Date()
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }

  private generateId(): string {
    return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createFormData(audioBuffer: Buffer): FormData {
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), 'audio.wav');
    formData.append('model', 'whisper-1');
    return formData;
  }

  // Session management
  async getActiveSession(userId: number): Promise<VoiceSession | null> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.isActive) {
        return session;
      }
    }
    return null;
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.emit('sessionEnded', session);
    }
  }

  async getSessionHistory(sessionId: string): Promise<VoiceCommand[]> {
    const session = this.sessions.get(sessionId);
    return session ? session.history : [];
  }

  // Cleanup inactive sessions
  private cleanupSessions(): void {
    const now = new Date();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > maxInactiveTime) {
        this.sessions.delete(sessionId);
        this.emit('sessionExpired', session);
      }
    }
  }

  // Start cleanup interval
  startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupSessions();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Real recommendation system using AI and location APIs
  private async getLocationRecommendations(
    location: string, 
    type: string, 
    budget?: string, 
    preferences?: string[]
  ): Promise<{ restaurants: string[]; activities: string[]; hotels: string[] }> {
    try {
      // Use OpenAI to generate contextual recommendations
      const openai = new (await import('openai')).default({
        apiKey: process.env.OPENAI_API_KEY
      });

      if (!process.env.OPENAI_API_KEY) {
        return this.getFallbackRecommendations(location, type);
      }

      const budgetText = budget ? ` with a ${budget} budget` : '';
      const preferencesText = preferences?.length ? ` considering preferences: ${preferences.join(', ')}` : '';
      
      const prompt = `Provide specific, real ${type === 'general' ? 'restaurant, activity, and hotel' : type} recommendations for ${location}${budgetText}${preferencesText}. 

Format as JSON with arrays for restaurants, activities, and hotels. Include only real, well-known establishments. Limit to 3-5 items per category.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          return {
            restaurants: parsed.restaurants || [],
            activities: parsed.activities || [],
            hotels: parsed.hotels || []
          };
        } catch (parseError) {
          console.warn('Failed to parse AI recommendations, using fallback');
        }
      }
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
    }

    return this.getFallbackRecommendations(location, type);
  }

  private getFallbackRecommendations(location: string, type: string): { restaurants: string[]; activities: string[]; hotels: string[] } {
    // Location-specific fallback recommendations
    const locationData: Record<string, any> = {
      'london': {
        restaurants: ['Dishoom', 'The Ivy', 'Sketch', 'Duck & Waffle', 'Hawksmoor'],
        activities: ['British Museum', 'London Eye', 'Tower Bridge', 'Tate Modern', 'Hyde Park'],
        hotels: ['The Shard', 'Claridge\'s', 'The Savoy', 'Hilton London Metropole', 'Premier Inn']
      },
      'new york': {
        restaurants: ['Le Bernardin', 'Eleven Madison Park', 'Peter Luger', 'Katz\'s Deli', 'Joe\'s Pizza'],
        activities: ['Central Park', 'Statue of Liberty', 'Times Square', 'Metropolitan Museum', 'Brooklyn Bridge'],
        hotels: ['The Plaza', 'The St. Regis', 'Pod Hotels', 'The High Line Hotel', 'citizenM']
      },
      'paris': {
        restaurants: ['Le Comptoir du Relais', 'L\'As du Fallafel', 'Breizh Café', 'Pierre Hermé', 'Du Pain et des Idées'],
        activities: ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame', 'Montmartre', 'Seine River Cruise'],
        hotels: ['Hotel des Grands Boulevards', 'Le Meurice', 'Hotel Malte Opera', 'Generator Paris', 'Hotel National']
      },
      'tokyo': {
        restaurants: ['Sukiyabashi Jiro', 'Ramen Yashichi', 'Tsuta', 'Nabezo', 'Gonpachi'],
        activities: ['Senso-ji Temple', 'Tokyo Skytree', 'Shibuya Crossing', 'Meiji Shrine', 'Tsukiji Market'],
        hotels: ['Park Hyatt Tokyo', 'Aman Tokyo', 'Capsule Hotel', 'Hotel Ryumeikan', 'Shinjuku Granbell Hotel']
      }
    };

    const locationKey = location.toLowerCase();
    const data = locationData[locationKey] || {
      restaurants: ['Local Restaurant', 'Popular Eatery', 'Recommended Café'],
      activities: ['City Tour', 'Local Museum', 'Historic Site'],
      hotels: ['Business Hotel', 'Boutique Hotel', 'Chain Hotel']
    };

    return data;
  }

  // Real trip information from database
  private async getTripInformation(tripId?: string): Promise<any> {
    try {
      // Import database connection
      const { db } = await import('../db/db.js');
      const { trips } = await import('../db/schema.js');
      const { eq, desc } = await import('drizzle-orm');

      if (tripId) {
        const trip = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
        if (trip.length > 0) {
          const tripData = trip[0];
          return {
            destination: tripData.location || tripData.city || tripData.title || 'Trip destination',
            dates: `${tripData.startDate?.toDateString()} to ${tripData.endDate?.toDateString()}`,
            flights: 'Flight details pending',
            hotel: tripData.hotel || 'Hotel details pending',
            status: tripData.completed ? 'Completed' : 'Active'
          };
        }
      }

      // Fallback to most recent trip if no tripId provided
      const recentTrips = await db.select().from(trips).orderBy(desc(trips.createdAt)).limit(1);
      if (recentTrips.length > 0) {
        const tripData = recentTrips[0];
        return {
          destination: tripData.location || tripData.city || tripData.title || 'Trip destination',
          dates: `${tripData.startDate?.toDateString()} to ${tripData.endDate?.toDateString()}`,
          flights: 'Flight details pending',
          hotel: tripData.hotel || 'Hotel details pending',
          status: tripData.completed ? 'Completed' : 'Active'
        };
      }
    } catch (error) {
      console.error('Error fetching trip information:', error);
    }

    // Fallback trip information
    return {
      destination: 'Your upcoming destination',
      dates: 'Dates to be confirmed',
      flights: 'Flight details pending',
      hotel: 'Hotel details pending',
      status: 'Planning in progress'
    };
  }

  // Real flight status from API
  private async getFlightStatus(flightNumber: string, date?: string): Promise<any> {
    try {
      // Try AviationStack API first
      if (process.env.AVIATIONSTACK_API_KEY) {
        const response = await fetch(
          `http://api.aviationstack.com/v1/flights?access_key=${process.env.AVIATIONSTACK_API_KEY}&flight_iata=${flightNumber}&limit=1`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const flight = data.data[0];
            return {
              flight: flightNumber,
              status: flight.flight_status || 'Unknown',
              departure: flight.departure?.scheduled || 'TBD',
              arrival: flight.arrival?.scheduled || 'TBD',
              gate: flight.departure?.gate || 'TBD',
              delay: flight.departure?.delay ? `${flight.departure.delay} minutes` : null
            };
          }
        }
      }
    } catch (error) {
      console.error('Error fetching flight status:', error);
    }

    // Fallback flight status
    return {
      flight: flightNumber,
      status: 'Status unavailable',
      departure: 'Check with airline',
      arrival: 'Check with airline',
      gate: 'TBD',
      delay: null
    };
  }

  // Real weather data from API
  private async getWeatherData(location: string, date?: string): Promise<any> {
    try {
      // Use OpenWeatherMap API
      if (process.env.OPENWEATHER_API_KEY) {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
        );
        
        if (response.ok) {
          const data = await response.json();
          return {
            location: data.name || location,
            temperature: `${Math.round(data.main.temp)}°C`,
            condition: data.weather[0]?.description || 'Unknown',
            forecast: `Feels like ${Math.round(data.main.feels_like)}°C. Humidity: ${data.main.humidity}%`
          };
        }
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
    }

    // Fallback weather data
    return {
      location: location,
      temperature: 'Temperature unavailable',
      condition: 'Weather data unavailable',
      forecast: 'Please check local weather services'
    };
  }
}

export const voiceInterfaceService = new VoiceInterfaceService();
voiceInterfaceService.startCleanupInterval();

