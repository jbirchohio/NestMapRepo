export interface HotelAddress {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    countryCode: string;
    region?: string;
    timezone: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}
export interface HotelRoom {
    id: string;
    name: string;
    description: string;
    maxOccupancy: number;
    bedConfiguration: string;
    amenities: string[];
    price: {
        amount: number;
        currency: string;
        formatted: string;
        taxes: number;
        fees: number;
        baseRate: number;
        total: number;
    };
    cancellationPolicy?: {
        type: 'FREE_CANCELLATION' | 'NON_REFUNDABLE' | 'PARTIAL_REFUND';
        description: string;
        deadline?: string;
        penaltyAmount?: number;
        penaltyCurrency?: string;
    };
    ratePlan: {
        id: string;
        name: string;
        mealPlan?: string;
        nonSmoking: boolean;
        refundable: boolean;
        available: number;
    };
    images: Array<{
        url: string;
        caption?: string;
        category: string;
        width?: number;
        height?: number;
    }>;
}
export interface HotelAmenity {
    code: string;
    name: string;
    category: string;
    description?: string;
    isAvailable: boolean;
}
export interface Hotel {
    id: string;
    name: string;
    starRating: number;
    address: HotelAddress;
    description: string;
    amenities: HotelAmenity[];
    images: Array<{
        url: string;
        caption?: string;
        category: string;
        width?: number;
        height?: number;
    }>;
    checkInTime: string;
    checkOutTime: string;
    contact: {
        phone: string;
        email?: string;
        website?: string;
    };
    chain?: {
        id: string;
        name: string;
    };
    rooms: HotelRoom[];
    policies: {
        checkIn: {
            minAge: number;
            specialInstructions?: string;
        };
        checkOut: {
            lateCheckOutAvailable: boolean;
            lateCheckOutFee?: number;
            lateCheckOutTime?: string;
        };
        pets: {
            allowed: boolean;
            fee?: number;
            policy?: string;
        };
        fees: Array<{
            type: string;
            amount: number;
            currency: string;
            description: string;
            mandatory: boolean;
        }>;
    };
    distanceFrom: Array<{
        place: string;
        distance: number;
        unit: 'km' | 'mi';
        duration?: number; // in minutes
    }>;
    metadata?: Record<string, unknown>;
    // Optional fields used by simplified UI components
    rating?: number;
    price?: {
        amount: number;
        currency: string;
        formatted?: string;
    };
    distanceFromCenter?: number;
    maxOccupancy?: number;
    freeCancellation?: boolean;
}
export interface HotelSearchParams {
    destination: string | {
        latitude: number;
        longitude: number;
    };
    checkIn: string;
    checkOut: string;
    guests: {
        adults: number;
        children?: number;
        rooms?: number;
    };
    filters?: {
        minStarRating?: number;
        priceRange?: {
            min?: number;
            max?: number;
            currency?: string;
        };
        amenities?: string[];
        hotelChains?: string[];
        freeCancellation?: boolean;
        mealPlans?: string[];
    };
    sortBy?: 'price' | 'starRating' | 'distance' | 'guestRating';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}
export interface HotelSearchResponse {
    success: boolean;
    data: {
        hotels: Hotel[];
        pagination: {
            total: number;
            page: number;
            pageSize: number;
            totalPages: number;
        };
        metadata: {
            currency: string;
            destination: string;
            checkIn: string;
            checkOut: string;
            guests: number;
        };
    };
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
}
