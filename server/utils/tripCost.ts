// Centralized trip cost calculation utilities

/** Represents the cost breakdown for a trip */
export interface TripCostBreakdown {
    flights: number;
    hotels: number;
    meals: number;
    activities: number;
    transportation: number;
    contingency: number;
    total: number;
}

/** Represents an activity with cost information */
export interface Activity {
    id?: string;
    name?: string;
    cost: number;
    duration?: number;
    type?: string;
}

/** Represents a flight with price information */
export interface Flight {
    id?: string;
    airline?: string;
    price: {
        amount: number;
        currency: string;
    };
    departure?: string;
    arrival?: string;
}

/** Represents accommodation with cost information */
interface Accommodation {
    id?: string;
    name?: string;
    costPerNight: number;
    type?: string;
    checkIn?: string;
    checkOut?: string;
}

/** Parameters for calculating trip costs */
export interface TripCostParams {
    destination?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    duration?: number;
    groupSize?: number;
    accommodationType?: 'luxury' | 'business' | 'budget';
    activities?: Activity[];
    flights?: Flight[];
    accommodation?: Accommodation[];
}
export const PRICING = {
    groupDiscount: 0.15,
    advanceBookingDiscount: 0.10,
    weekendSurcharge: 0.20,
    contingencyRate: 0.10
};
/**
 * Calculates the total cost of a trip based on various parameters
 * @param trip - Trip details including flights, accommodation, activities, etc.
 * @returns The total calculated cost of the trip
 */
export function calculateTripCost(trip: TripCostParams | Record<string, unknown>): number {
    if (!trip)
        return 0;
    // Handle different trip object structures
    const duration = typeof trip.duration === 'number'
        ? trip.duration
        : (trip.startDate && trip.endDate && (typeof trip.startDate === 'string' || trip.startDate instanceof Date) && (typeof trip.endDate === 'string' || trip.endDate instanceof Date)
            ? calculateDuration(trip.startDate, trip.endDate)
            : 3);
    const groupSize = trip.groupSize || 1;
    // Base costs per day
    const baseCosts = {
        luxury: { hotel: 300, meals: 100, transport: 50 },
        business: { hotel: 150, meals: 60, transport: 30 },
        budget: { hotel: 80, meals: 30, transport: 20 }
    };
    const accommodationType = trip.accommodationType || 'business';
    const costs = baseCosts[accommodationType as keyof typeof baseCosts];
    // Calculate breakdown
    const flights = Array.isArray(trip.flights)
        ? trip.flights.reduce((sum: number, flight: Flight) => sum + (flight.price?.amount || 500), 0)
        : 800;
    const hotels = (costs.hotel ?? 0) * duration;
    const meals = costs.meals * duration;
    const activities = Array.isArray(trip.activities)
        ? trip.activities.reduce((sum: number, activity: Activity) => sum + (activity.cost || 50), 0)
        : (duration * 75);
    const transportation = costs.transport * duration;
    const subtotal = flights + hotels + meals + activities + transportation;
    const contingency = subtotal * PRICING.contingencyRate;
    return Math.round((subtotal + contingency) * (typeof groupSize === 'number' ? groupSize : 1));
}
export function calculateTripCostBreakdown(trip: TripCostParams): TripCostBreakdown {
    if (!trip) {
        return {
            flights: 0,
            hotels: 0,
            meals: 0,
            activities: 0,
            transportation: 0,
            contingency: 0,
            total: 0
        };
    }
    const duration = trip.duration || 3;
    const groupSize = trip.groupSize || 1;
    const baseCosts = {
        luxury: { hotel: 300, meals: 100, transport: 50 },
        business: { hotel: 150, meals: 60, transport: 30 },
        budget: { hotel: 80, meals: 30, transport: 20 }
    };
    const accommodationType = trip.accommodationType || 'business';
    const costs = baseCosts[accommodationType as keyof typeof baseCosts];
    const flights = trip.flights?.reduce((sum: number, flight: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) => sum + (flight.price?.amount || 500), 0) || 800;
    const hotels = costs.hotel * duration;
    const meals = costs.meals * duration;
    const activities = trip.activities?.reduce((sum: number, activity: any /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */ /** FIXANYERROR: Replace 'any' */) => sum + (activity.cost || 50), 0) || (duration * 75);
    const transportation = costs.transport * duration;
    const subtotal = flights + hotels + meals + activities + transportation;
    const contingency = subtotal * PRICING.contingencyRate;
    const total = Math.round((subtotal + contingency) * groupSize);
    return {
        flights: Math.round(flights * groupSize),
        hotels: Math.round(hotels * groupSize),
        meals: Math.round(meals * groupSize),
        activities: Math.round(activities * groupSize),
        transportation: Math.round(transportation * groupSize),
        contingency: Math.round(contingency * groupSize),
        total
    };
}
function calculateDuration(startDate?: string | Date, endDate?: string | Date): number {
    if (!startDate || !endDate)
        return 3;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
}
export function calculateOptimizationSavings(originalCost: number, optimizationType: string = 'standard'): number {
    const savingsRates = {
        standard: 0.15,
        aggressive: 0.25,
        conservative: 0.08
    };
    const rate = savingsRates[optimizationType as keyof typeof savingsRates] || savingsRates.standard;
    return Math.round(originalCost * rate);
}
export function calculateOptimizationSavingsBreakdown(originalCost: number, optimizationType: string = 'standard'): { savings: number; rate: number } {
    const savingsRates = {
        standard: 0.15,
        aggressive: 0.25,
        conservative: 0.08
    };
    const rate = savingsRates[optimizationType as keyof typeof savingsRates] || savingsRates.standard;
    const savings = Math.round(originalCost * rate);
    return { savings, rate };
}