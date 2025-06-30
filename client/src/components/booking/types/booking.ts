import { z } from 'zod';
import type { Flight } from './flight';
import type { Hotel } from '@shared/schema/types/hotel';

export const clientInfoSchema = z.object({
    // Travel Details
    origin: z.string().min(1, 'Origin is required'),
    destination: z.string().min(1, 'Destination is required'),
    departureDate: z.string().min(1, 'Departure date is required'),
    returnDate: z.string().optional(),
    tripType: z.enum(['one-way', 'round-trip']),
    passengers: z.number().min(1, 'At least 1 passenger required').max(9, 'Maximum 9 passengers'),
    // Primary Traveler Details
    primaryTraveler: z.object({
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        email: z.string().email('Valid email is required'),
        phone: z.string().min(1, 'Phone number is required'),
        dateOfBirth: z.string().min(1, 'Date of birth is required'),
    }),
    // Additional Travelers (if any)
    additionalTravelers: z.array(z.object({
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        dateOfBirth: z.string().min(1, 'Date of birth is required'),
    })).optional().default([]),
    // Preferences
    cabin: z.enum(['economy', 'premium-economy', 'business', 'first']).default('economy'),
    budget: z.number().optional(),
    // Corporate Information
    department: z.string().optional(),
    projectCode: z.string().optional(),
    costCenter: z.string().optional(),
});
export type ClientInfo = z.infer<typeof clientInfoSchema>;
export type TripType = 'one-way' | 'round-trip';
export type CabinType = 'economy' | 'premium-economy' | 'business' | 'first';
export type BookingStep = 'client-info' | 'flights' | 'hotels' | 'confirmation';
export interface TravelerBooking {
    traveler: string;
    departureFlight?: Flight | null;
    returnFlight?: Flight | null;
}
export interface BookingState {
    currentStep: BookingStep;
    clientInfo: ClientInfo | null;
    formData: Partial<ClientInfo>;
    flightResults: Flight[];
    hotelResults: Hotel[];
    selectedDepartureFlight: Flight | null;
    selectedReturnFlight: Flight | null;
    selectedHotel: Hotel | null;
    isSearching: boolean;
    isBooking: boolean;
    currentTravelerIndex: number;
    travelerBookings: TravelerBooking[];
}
export const INITIAL_BOOKING_STATE: Omit<BookingState, 'currentStep'> = {
    clientInfo: null,
    formData: {
        tripType: 'round-trip',
        passengers: 1,
        cabin: 'economy',
        primaryTraveler: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            dateOfBirth: '',
        },
        additionalTravelers: [],
    },
    flightResults: [],
    hotelResults: [],
    selectedDepartureFlight: null,
    selectedReturnFlight: null,
    selectedHotel: null,
    isSearching: false,
    isBooking: false,
    currentTravelerIndex: 0,
    travelerBookings: [],
};
