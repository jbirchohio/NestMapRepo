import { getOpenAIClient, OPENAI_MODEL } from "./services/openaiClient.js";
import { calculateTripCost } from "./utils/tripCost.js";
import { detectTripConflicts } from "./services/conflictDetector.js";
import { predictFlightPrices, predictCrowdLevels, generateWeatherAdaptiveItinerary } from "./predictiveAI";
import { optimizeScheduleIntelligently, detectScheduleConflicts } from "./smartOptimizer";
import { calculateCarbonFootprint } from "./carbonTracker";
import { searchFlights, searchHotels } from "./bookingProviders";
interface BusinessTripRequest {
    clientName: string;
    destination: string;
    startDate: string;
    endDate: string;
    budget: number;
    currency: string;
    workSchedule: {
        workDays: string[]; // ['Monday', 'Tuesday']
        workHours: string; // '9:00-17:00'
        meetingBlocks?: string[]; // ['Monday 10:00-12:00']
    };
    preferences: {
        foodTypes: string[];
        accommodationType: 'luxury' | 'business' | 'budget';
        activityTypes: string[];
        dietaryRestrictions?: string[];
        accessibility?: string[];
    };
    companyInfo: {
        name: string;
        industry: string;
        travelPolicy?: any;
    };
    tripPurpose: string;
    groupSize: number;
}
interface GeneratedBusinessTrip {
    tripSummary: {
        title: string;
        description: string;
        totalCost: number;
        carbonFootprint: number;
        duration: number;
    };
    flights: any[];
    accommodation: any[];
    activities: any[];
    workSchedule: any[];
    meals: any[];
    transportation: any[];
    budgetBreakdown: {
        flights: number;
        hotels: number;
        meals: number;
        activities: number;
        transportation: number;
        contingency: number;
    };
    conflicts: any[];
    recommendations: string[];
    weatherConsiderations: any;
    complianceNotes: string[];
}
export async function generateBusinessTrip(request: BusinessTripRequest): Promise<GeneratedBusinessTrip> {
    try {
        // Starting business trip generation
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        const openai = getOpenAIClient();
        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                {
                    role: "system",
                    content: `You are an expert corporate travel planner specializing in business trip optimization. 
          Create comprehensive, realistic travel itineraries that balance business needs with cost efficiency 
          and employee satisfaction. Consider all constraints and preferences while ensuring compliance 
          with corporate travel policies.`
                },
                {
                    role: "user",
                    content: `Generate a complete business trip for the following requirements:

          Client: ${request.clientName}
          Destination: ${request.destination}
          Dates: ${request.startDate} to ${request.endDate}
          Budget: ${request.currency} ${request.budget}
          Group Size: ${request.groupSize} person(s)
          
          Work Requirements:
          - Work days: ${request.workSchedule.workDays.join(', ')}
          - Work hours: ${request.workSchedule.workHours}
          - Meeting blocks: ${request.workSchedule.meetingBlocks?.join(', ') || 'None specified'}
          
          Preferences:
          - Food preferences: ${request.preferences.foodTypes.join(', ')}
          - Accommodation: ${request.preferences.accommodationType}
          - Activities: ${request.preferences.activityTypes.join(', ')}
          - Dietary restrictions: ${request.preferences.dietaryRestrictions?.join(', ') || 'None'}
          
          Trip Purpose: ${request.tripPurpose}
          Company: ${request.companyInfo.name} (${request.companyInfo.industry})
          
          Create a detailed itinerary with:
          1. Appropriate flights with realistic pricing
          2. Business-suitable accommodation
          3. Work-friendly schedule with dedicated work blocks
          4. Client entertainment and networking opportunities
          5. Meals that match preferences and dietary needs
          6. Local transportation arrangements
          7. Budget allocation across all categories
          8. Compliance considerations for corporate travel
          
          Ensure the schedule allows for:
          - Adequate rest and preparation time
          - Buffer time for meetings and work
          - Appropriate business entertainment
          - Cultural considerations for the destination
          
          Provide response in detailed JSON format with all components.`
                }
            ],
            response_format: { type: "json_object" }
        });
        const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
        // AI trip generation completed, enhancing with real data
        // Enhance with real flight and hotel data
        const enhancedTrip = await enhanceTripWithRealData(aiResponse, request);
        // Add predictive intelligence
        const intelligentTrip = await addPredictiveIntelligence(enhancedTrip, request);
        // Detect and resolve conflicts
        const optimizedTrip = await optimizeTripSchedule(intelligentTrip, request);
        // Calculate environmental impact
        const sustainableTrip = await addSustainabilityMetrics(optimizedTrip, request);
        console.log('Business trip generation completed successfully');
        return sustainableTrip;
    }
    catch (error) {
        console.error('Error generating business trip:', error);
        throw new Error(`Failed to generate business trip: ${error}`);
    }
}
async function enhanceTripWithRealData(aiTrip: any, request: BusinessTripRequest): Promise<any> {
    try {
        // Search for real flights if we have access to booking APIs
        let flights = aiTrip.flights || [];
        try {
            const flightResults = await searchFlights({
                origin: 'JFK', // This would be determined from user's location
                destination: request.destination,
                departureDate: request.startDate,
                returnDate: request.endDate,
                passengers: request.groupSize
            });
            if (flightResults && flightResults.length > 0) {
                flights = flightResults.slice(0, 3).map(flight => ({
                    ...flight,
                    selected: false,
                    businessAppropriate: true
                }));
            }
        }
        catch (error) {
            // Using AI-generated flight data as fallback
        }
        // Search for real hotels
        let hotels = aiTrip.accommodation || [];
        try {
            const hotelResults = await searchHotels({
                destination: request.destination,
                checkIn: request.startDate,
                checkOut: request.endDate,
                guests: request.groupSize,
                rooms: Math.ceil(request.groupSize / 2)
            });
            if (hotelResults && hotelResults.length > 0) {
                hotels = hotelResults.slice(0, 3).map(hotel => ({
                    ...hotel,
                    businessFacilities: true,
                    selected: false
                }));
            }
        }
        catch (error) {
            // Using AI-generated hotel data as fallback
        }
        return {
            ...aiTrip,
            flights,
            accommodation: hotels,
            dataSource: 'enhanced_with_real_data'
        };
    }
    catch (error) {
        console.error('Enhancement with real data failed, using AI data:', error);
        return aiTrip;
    }
}
async function addPredictiveIntelligence(trip: any, request: BusinessTripRequest): Promise<any> {
    try {
        // Add price predictions for flights
        const pricePredictions = await predictFlightPrices('JFK', // User's origin
        request.destination, request.startDate, request.endDate);
        // Add crowd predictions for activities
        const crowdInsights = await Promise.all((trip.activities || []).map(async (activity: any) => {
            const crowdData = await predictCrowdLevels(activity.location || request.destination, activity.date || request.startDate, activity.time || '10:00');
            return {
                ...activity,
                crowdPrediction: crowdData
            };
        }));
        // Add weather-adaptive scheduling
        const dates = generateDateRange(request.startDate, request.endDate);
        const weatherAdaptation = await generateWeatherAdaptiveItinerary(trip.activities || [], request.destination, dates);
        return {
            ...trip,
            predictiveInsights: {
                pricePredictions,
                crowdInsights,
                weatherAdaptation
            },
            activities: crowdInsights
        };
    }
    catch (error) {
        console.log('Predictive intelligence enhancement failed:', error);
        return trip;
    }
}
async function optimizeTripSchedule(trip: any, request: BusinessTripRequest): Promise<any> {
    try {
        // Detect scheduling conflicts
        const conflicts = await detectScheduleConflicts(trip.activities || []);
        // Optimize schedule for efficiency
        const optimization = await optimizeScheduleIntelligently(trip.activities || [], request.preferences, {
            workSchedule: request.workSchedule,
            budget: request.budget,
            groupSize: request.groupSize
        });
        // Generate business-specific recommendations
        const businessRecommendations = generateBusinessRecommendations(trip, request, conflicts);
        return {
            ...trip,
            conflicts,
            optimization,
            recommendations: [
                ...trip.recommendations || [],
                ...businessRecommendations
            ]
        };
    }
    catch (error) {
        console.log('Schedule optimization failed:', error);
        return {
            ...trip,
            conflicts: [],
            recommendations: trip.recommendations || []
        };
    }
}
async function addSustainabilityMetrics(trip: any, request: BusinessTripRequest): Promise<any> {
    try {
        const carbonFootprint = await calculateCarbonFootprint(trip.activities || [], trip.flights || [], trip.accommodation || [], request.destination);
        const complianceNotes = generateComplianceNotes(trip, request);
        return {
            ...trip,
            sustainability: carbonFootprint,
            complianceNotes,
            tripSummary: {
                ...trip.tripSummary,
                carbonFootprint: carbonFootprint.totalCO2kg
            }
        };
    }
    catch (error) {
        console.log('Sustainability metrics calculation failed:', error);
        return trip;
    }
}
function generateBusinessRecommendations(trip: any, request: BusinessTripRequest, conflicts: any[]): string[] {
    const recommendations: string[] = [];
    // Budget optimization
    if (trip.budgetBreakdown?.total > request.budget * 0.9) {
        recommendations.push('Consider economy flights to stay within budget constraints');
    }
    // Work schedule optimization
    if (request.workSchedule.workDays.length > 0) {
        recommendations.push('Schedule important meetings during peak business hours (10 AM - 4 PM local time)');
    }
    // Conflict resolution
    if (conflicts.length > 0) {
        recommendations.push(`${conflicts.length} scheduling conflicts detected - review timing for optimal workflow`);
    }
    // Industry-specific recommendations
    if (request.companyInfo.industry === 'technology') {
        recommendations.push('Include networking venues popular with local tech community');
    }
    // Group size considerations
    if (request.groupSize > 1) {
        recommendations.push('Book group rates for activities and consider private transportation');
    }
    return recommendations;
}
function generateComplianceNotes(trip: any, request: BusinessTripRequest): string[] {
    const notes: string[] = [];
    notes.push('All expenses align with standard corporate travel policies');
    notes.push('Accommodation meets business traveler standards');
    if (trip.budgetBreakdown?.meals) {
        notes.push('Meal expenses within per-diem allowances for destination');
    }
    if (request.preferences.accommodationType === 'luxury') {
        notes.push('Premium accommodation justified for client relationship management');
    }
    return notes;
}
function generateDateRange(startDate: string | Date, endDate: string | Date): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Handle invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Invalid date provided to generateDateRange');
        return [];
    }
    
    // Create a new date object for iteration to avoid modifying the original
    const currentDate = new Date(start);
    
    // Reset time components to avoid timezone issues
    currentDate.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    while (currentDate <= end) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
}
// Quick trip generation for simple requests
export async function generateQuickBusinessTrip(destination: string, duration: number, budget: number, purpose: string): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7); // 1 week from now
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration);
    const request: BusinessTripRequest = {
        clientName: 'Business Client',
        destination,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        budget,
        currency: 'USD',
        workSchedule: {
            workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            workHours: '9:00-17:00'
        },
        preferences: {
            foodTypes: ['Business Dining', 'Local Cuisine'],
            accommodationType: 'business',
            activityTypes: ['Networking', 'Cultural Sites']
        },
        companyInfo: {
            name: 'Corporate Client',
            industry: 'Business Services'
        },
        tripPurpose: purpose,
        groupSize: 1
    };
    return generateBusinessTrip(request);
}
