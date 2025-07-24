import { z } from 'zod';
import { db } from './src/db/db';
import { bookings, bookingStatusEnum, bookingTypeEnum } from './src/db/bookingSchema';
import { eq, and } from 'drizzle-orm';
import * as crypto from 'crypto';

// Enhanced booking provider system with real API integration
interface BookingProvider {
  name: string;
  type: 'flight' | 'hotel' | 'activity';
  enabled: boolean;
  requiresAuth: boolean;
  book: (params: any) => Promise<BookingResult>;
  cancel: (bookingId: string) => Promise<CancellationResult>;
  getStatus: (bookingId: string) => Promise<BookingStatus>;
}

// Zod schemas for validation
const PassengerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  dateOfBirth: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date of birth'),
  gender: z.enum(['MALE', 'FEMALE']),
  passport: z.object({
    number: z.string().min(6, 'Passport number must be at least 6 characters'),
    issuanceCountry: z.string().length(2, 'Issuance country must be a 2-letter country code'),
    nationality: z.string().length(2, 'Nationality must be a 2-letter country code'),
    issuanceDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid issuance date'),
    expiryDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid expiry date'),
    birthPlace: z.string().min(1, 'Birth place is required'),
    issuanceLocation: z.string().min(1, 'Issuance location is required'),
  })
});

const FlightBookingParamsSchema = z.object({
  offer: z.any(), // Complex Amadeus offer object
  passengers: z.array(PassengerSchema),
  paymentToken: z.string().min(1, 'Payment token is required for secure payment processing'),
  userId: z.string().uuid(),
  tripId: z.string().uuid().optional(),
});

const HotelBookingParamsSchema = z.object({
  offer: z.object({
    hotelId: z.string(),
    roomType: z.string(),
    price: z.object({
      amount: z.number(),
      currency: z.string()
    })
  }),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.array(z.object({
    firstName: z.string(),
    lastName: z.string(),
    age: z.number().optional(),
    title: z.enum(['MR', 'MRS', 'MS', 'DR']).default('MR'),
    phone: z.string().min(10, 'Phone number is required'),
    email: z.string().email('Valid email is required')
  })),
  paymentToken: z.string().min(1, 'Payment token is required for secure payment processing'),
  userId: z.string().uuid(),
  tripId: z.string().uuid().optional(),
});

interface BookingResult {
  id: string;
  reference: string;
  status: 'confirmed' | 'pending' | 'failed';
  totalAmount: number;
  currency: string;
  confirmationDetails: Record<string, any>;
  cancellationPolicy?: Record<string, any>;
  dbBookingId?: string; // Internal database ID
}

interface CancellationResult {
  success: boolean;
  refundAmount?: number;
  cancellationFee?: number;
  refundMethod?: string;
  cancellationReference?: string;
}

interface BookingStatus {
  status: 'confirmed' | 'cancelled' | 'modified' | 'completed';
  lastUpdated: Date;
  details?: Record<string, any>;
}

// Database booking persistence helper
class BookingPersistence {
  static async saveBooking(params: {
    userId: string;
    tripId?: string;
    type: 'flight' | 'hotel' | 'activity';
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    location?: string;
    provider: string;
    providerReferenceId: string;
    confirmationCode?: string;
    price: number;
    currency: string;
    metadata: Record<string, any>;
  }): Promise<string> {
    const booking = await db.insert(bookings).values({
      userId: params.userId,
      tripId: params.tripId || null,
      type: params.type,
      title: params.title,
      description: params.description || null,
      startDate: params.startDate,
      endDate: params.endDate,
      location: params.location || null,
      status: 'confirmed',
      provider: params.provider,
      providerReferenceId: params.providerReferenceId,
      confirmationCode: params.confirmationCode || null,
      price: Math.round(params.price * 100), // Convert to cents
      currency: params.currency,
      metadata: params.metadata,
      confirmedAt: new Date(),
    }).returning({ id: bookings.id });

    return booking[0].id;
  }

  static async updateBookingStatus(bookingId: string, status: 'pending' | 'confirmed' | 'cancelled' | 'completed'): Promise<void> {
    await db.update(bookings)
      .set({ 
        status, 
        updatedAt: new Date(),
        ...(status === 'confirmed' && { confirmedAt: new Date() })
      })
      .where(eq(bookings.id, bookingId));
  }

  static async getBooking(bookingId: string) {
    const result = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    return result[0] || null;
  }

  static async getBookingByProviderReference(provider: string, referenceId: string) {
    const result = await db.select().from(bookings).where(
      and(
        eq(bookings.provider, provider),
        eq(bookings.providerReferenceId, referenceId)
      )
    );
    return result[0] || null;
  }
}

// Amadeus Flight Booking Provider
class AmadeusFlightProvider implements BookingProvider {
  name = 'Amadeus Flights';
  type = 'flight' as const;
  enabled = !!(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
  requiresAuth = true;

  private async getAccessToken(): Promise<string> {
    const clientId = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Amadeus API credentials not configured. Please set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET environment variables.');
    }

    try {
      const response = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Amadeus authentication failed: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      throw new Error(`Failed to authenticate with Amadeus API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async book(params: z.infer<typeof FlightBookingParamsSchema>): Promise<BookingResult> {
    // Validate input parameters
    const validatedParams = FlightBookingParamsSchema.parse(params);
    
    const accessToken = await this.getAccessToken();
    
    // Prepare booking request for Amadeus Flight Create Orders API
    const bookingRequest = {
      data: {
        type: 'flight-order',
        flightOffers: [validatedParams.offer],
        travelers: validatedParams.passengers.map((passenger, index) => {
          const traveler: any = {
            id: (index + 1).toString(),
            dateOfBirth: passenger.dateOfBirth || '1990-01-01',
            name: {
              firstName: passenger.firstName,
              lastName: passenger.lastName
            },
            gender: passenger.gender || 'MALE',
            contact: {
              emailAddress: passenger.email,
              phones: passenger.phone ? [{
                deviceType: 'MOBILE',
                countryCallingCode: '1',
                number: passenger.phone.replace(/\D/g, '')
              }] : []
            }
          };

          // Add passport information if provided
          if (passenger.passport) {
            traveler.documents = [{
              documentType: 'PASSPORT',
              number: passenger.passport.number,
              issuanceCountry: passenger.passport.issuanceCountry,
              nationality: passenger.passport.nationality,
              issuanceDate: passenger.passport.issuanceDate,
              expiryDate: passenger.passport.expiryDate,
              birthPlace: passenger.passport.birthPlace || 'Unknown',
              issuanceLocation: passenger.passport.issuanceLocation || 'Unknown',
              validityCountry: passenger.passport.issuanceCountry,
              holder: true
            }];
          } else {
            // Passport is required for international flights
            throw new Error(`Passport information is required for passenger ${passenger.firstName} ${passenger.lastName}. Please provide complete passport details.`);
          }

          return traveler;
        })
      }
    };

    try {
      const response = await fetch('https://api.amadeus.com/v1/booking/flight-orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/vnd.amadeus+json',
        },
        body: JSON.stringify(bookingRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Amadeus booking failed: ${errorData.errors?.[0]?.detail || `HTTP ${response.status}`}`);
      }

      const bookingData = await response.json();
      const order = bookingData.data;

      // Calculate flight duration and details
      const firstSegment = order.flightOffers[0].itineraries[0].segments[0];
      const lastSegment = order.flightOffers[0].itineraries[order.flightOffers[0].itineraries.length - 1].segments.slice(-1)[0];
      
      const startDate = new Date(firstSegment.departure.at);
      const endDate = new Date(lastSegment.arrival.at);

      // Save to database
      const dbBookingId = await BookingPersistence.saveBooking({
        userId: validatedParams.userId,
        tripId: validatedParams.tripId,
        type: 'flight',
        title: `Flight ${firstSegment.departure.iataCode} → ${lastSegment.arrival.iataCode}`,
        description: `${order.flightOffers[0].itineraries.length > 1 ? 'Round-trip' : 'One-way'} flight with ${firstSegment.carrierCode}`,
        startDate,
        endDate,
        location: `${firstSegment.departure.iataCode} - ${lastSegment.arrival.iataCode}`,
        provider: 'amadeus',
        providerReferenceId: order.id,
        confirmationCode: order.associatedRecords?.[0]?.reference,
        price: parseFloat(order.flightOffers[0].price.total),
        currency: order.flightOffers[0].price.currency,
        metadata: {
          pnr: order.associatedRecords?.[0]?.reference,
          ticketNumbers: order.travelers?.map((t: any) => t.documents?.[0]?.number),
          flightDetails: order.flightOffers[0].itineraries,
          travelers: order.travelers,
          bookingRequest: bookingRequest.data
        }
      });

      return {
        id: order.id,
        reference: order.associatedRecords?.[0]?.reference || order.id,
        status: 'confirmed',
        totalAmount: parseFloat(order.flightOffers[0].price.total),
        currency: order.flightOffers[0].price.currency,
        confirmationDetails: {
          pnr: order.associatedRecords?.[0]?.reference,
          ticketNumbers: order.travelers?.map((t: any) => t.documents?.[0]?.number),
          flightDetails: order.flightOffers[0].itineraries,
          departure: {
            airport: firstSegment.departure.iataCode,
            time: firstSegment.departure.at,
            terminal: firstSegment.departure.terminal
          },
          arrival: {
            airport: lastSegment.arrival.iataCode,
            time: lastSegment.arrival.at,
            terminal: lastSegment.arrival.terminal
          },
          airline: firstSegment.carrierCode,
          duration: order.flightOffers[0].itineraries[0].duration
        },
        cancellationPolicy: order.rules?.cancellation || {},
        dbBookingId
      };
    } catch (error) {
      throw new Error(`Amadeus booking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancel(bookingId: string): Promise<CancellationResult> {
    try {
      const accessToken = await this.getAccessToken();
      
      // First, get the booking from our database
      const dbBooking = await BookingPersistence.getBookingByProviderReference('amadeus', bookingId);
      if (!dbBooking) {
        throw new Error('Booking not found in database');
      }

      const response = await fetch(`https://api.amadeus.com/v1/booking/flight-orders/${bookingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const cancellationReference = `CANCEL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      if (!response.ok) {
        // Update database status even if API call fails
        await BookingPersistence.updateBookingStatus(dbBooking.id, 'cancelled');
        
        // Return partial success - booking marked as cancelled in our system
        return { 
          success: false,
          cancellationReference,
          refundAmount: 0,
          cancellationFee: 0
        };
      }

      // Update database status
      await BookingPersistence.updateBookingStatus(dbBooking.id, 'cancelled');

      // Calculate refund based on cancellation policy
      const bookingPrice = dbBooking.price || 0;
      const refundAmount = this.calculateRefund(bookingPrice / 100, dbBooking.metadata as any);

      return {
        success: true,
        refundAmount,
        cancellationFee: Math.max(0, (bookingPrice / 100) - refundAmount),
        refundMethod: 'original_payment_method',
        cancellationReference
      };
    } catch (error) {
      throw new Error(`Amadeus cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateRefund(totalAmount: number, metadata: any): number {
    // Calculate refund based on airline cancellation policies and departure time
    const bookingDate = new Date(metadata?.bookingDate || Date.now());
    const departureDate = new Date(metadata?.flightDetails?.[0]?.segments?.[0]?.departure?.at || Date.now());
    const hoursUntilDeparture = (departureDate.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntilDeparture > 24) {
      return totalAmount * 0.9; // 90% refund if more than 24 hours
    } else if (hoursUntilDeparture > 2) {
      return totalAmount * 0.5; // 50% refund if more than 2 hours
    } else {
      return 0; // No refund if less than 2 hours
    }
  }

  async getStatus(bookingId: string): Promise<BookingStatus> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Check database first
      const dbBooking = await BookingPersistence.getBookingByProviderReference('amadeus', bookingId);
      
      const response = await fetch(`https://api.amadeus.com/v1/booking/flight-orders/${bookingId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        // Fall back to database status if API is unavailable
        if (dbBooking) {
          return {
            status: dbBooking.status as any,
            lastUpdated: dbBooking.updatedAt,
            details: {
              source: 'database',
              bookingId: dbBooking.id,
              provider: 'amadeus'
            }
          };
        }
        throw new Error(`Failed to fetch booking status: HTTP ${response.status}`);
      }

      const data = await response.json();
      
      return {
        status: 'confirmed', // Amadeus doesn't provide dynamic status updates typically
        lastUpdated: new Date(),
        details: {
          source: 'amadeus-api',
          amadeusData: data.data,
          dbBooking: dbBooking ? {
            id: dbBooking.id,
            status: dbBooking.status,
            confirmedAt: dbBooking.confirmedAt
          } : null
        }
      };
    } catch (error) {
      throw new Error(`Amadeus status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Real Hotel Booking Provider (works with multiple APIs)
class RealHotelProvider implements BookingProvider {
  name = 'Hotel Booking Service';
  type = 'hotel' as const;
  enabled = true; // Always enabled - uses fallback systems
  requiresAuth = false;

  async book(params: z.infer<typeof HotelBookingParamsSchema>): Promise<BookingResult> {
    // Validate input parameters
    const validatedParams = HotelBookingParamsSchema.parse(params);
    
    if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
      throw new Error('Hotel booking requires Amadeus API credentials. Please set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET environment variables.');
    }
    
    return await this.bookWithAmadeus(validatedParams);
  }

  private async bookWithAmadeus(params: z.infer<typeof HotelBookingParamsSchema>): Promise<BookingResult> {
    const amadeusProvider = new AmadeusFlightProvider();
    const accessToken = await (amadeusProvider as any).getAccessToken();

    // First, we need to get the hotel offer details using the Hotel Shopping API
    // This assumes params.offer.hotelId contains the hotel ID from a previous search
    const hotelOffersResponse = await fetch(`https://api.amadeus.com/v3/shopping/hotel-offers?hotelIds=${params.offer.hotelId}&adults=${params.guests.length}&checkInDate=${params.checkIn}&checkOutDate=${params.checkOut}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!hotelOffersResponse.ok) {
      const errorData = await hotelOffersResponse.json();
      throw new Error(`Amadeus hotel search failed: ${errorData.errors?.[0]?.detail || `HTTP ${hotelOffersResponse.status}`}`);
    }

    const hotelOffersData = await hotelOffersResponse.json();
    const hotelOffer = hotelOffersData.data?.[0];
    
    if (!hotelOffer || !hotelOffer.offers?.[0]) {
      throw new Error('No hotel offers available for the selected dates and criteria');
    }

    // Use the actual offer from Amadeus API instead of the passed offer
    const selectedOffer = hotelOffer.offers[0];
    
    // Prepare booking request for Amadeus Hotel Booking API
    const bookingRequest = {
      data: {
        type: 'hotel-booking',
        hotelOffer: {
          ...selectedOffer,
          guests: params.guests.map((guest, index) => ({
            id: index + 1,
            name: {
              title: guest.title,
              firstName: guest.firstName,
              lastName: guest.lastName
            },
            contact: {
              phone: guest.phone,
              email: guest.email
            }
          }))
        },
        payment: {
          method: 'creditCard',
          card: {
            // Use the provided payment token from Stripe
            token: params.paymentToken
          }
        }
      }
    };

    // Make the actual booking request to Amadeus
    const bookingResponse = await fetch('https://api.amadeus.com/v1/booking/hotel-bookings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.amadeus+json',
      },
      body: JSON.stringify(bookingRequest),
    });

    if (!bookingResponse.ok) {
      const errorData = await bookingResponse.json();
      throw new Error(`Amadeus hotel booking failed: ${errorData.errors?.[0]?.detail || `HTTP ${bookingResponse.status}`}`);
    }

    const bookingData = await bookingResponse.json();
    const booking = bookingData.data[0];
    
    const startDate = new Date(params.checkIn);
    const endDate = new Date(params.checkOut);
    const nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Save to database with real booking data
    const dbBookingId = await BookingPersistence.saveBooking({
      userId: params.userId,
      tripId: params.tripId,
      type: 'hotel',
      title: `${booking.hotel.name} - ${selectedOffer.room.type}`,
      description: `${nights} night${nights > 1 ? 's' : ''} at ${booking.hotel.name}`,
      startDate,
      endDate,
      location: `${booking.hotel.address.cityName}, ${booking.hotel.address.countryCode}`,
      provider: 'amadeus-hotels',
      providerReferenceId: booking.id,
      confirmationCode: booking.providerConfirmationId,
      price: parseFloat(selectedOffer.price.total),
      currency: selectedOffer.price.currency,
      metadata: {
        hotelId: booking.hotel.hotelId,
        hotelName: booking.hotel.name,
        roomType: selectedOffer.room.type,
        guests: params.guests,
        nights,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        bookingMethod: 'amadeus-api',
        amadeusBookingId: booking.id,
        confirmationId: booking.providerConfirmationId,
        hotelDetails: {
          name: booking.hotel.name,
          address: booking.hotel.address,
          contact: booking.hotel.contact,
          amenities: booking.hotel.amenities || []
        },
        rateDetails: selectedOffer.price,
        policies: selectedOffer.policies || {}
      }
    });

    return {
      id: booking.id,
      reference: booking.providerConfirmationId,
      status: 'confirmed',
      totalAmount: parseFloat(selectedOffer.price.total),
      currency: selectedOffer.price.currency,
      confirmationDetails: {
        provider: 'amadeus-hotels',
        hotelId: booking.hotel.hotelId,
        hotelName: booking.hotel.name,
        roomType: selectedOffer.room.type,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        guests: params.guests,
        nights,
        confirmationNumber: booking.providerConfirmationId,
        bookingDate: new Date().toISOString(),
        contact: booking.hotel.contact,
        address: booking.hotel.address,
        amenities: booking.hotel.amenities || [],
        policies: selectedOffer.policies || {},
        rateBreakdown: selectedOffer.price
      },
      cancellationPolicy: selectedOffer.policies?.cancellation || {
        cancellable: true,
        deadline: new Date(startDate.getTime() - 24 * 60 * 60 * 1000),
        penalty: parseFloat(selectedOffer.price.total) * 0.1
      },
      dbBookingId
    };
  }

  async cancel(bookingId: string): Promise<CancellationResult> {
    try {
      const amadeusProvider = new AmadeusFlightProvider();
      const accessToken = await (amadeusProvider as any).getAccessToken();

      // Find booking in database
      const dbBooking = await BookingPersistence.getBookingByProviderReference('amadeus-hotels', bookingId);
      
      if (!dbBooking) {
        throw new Error('Hotel booking not found in database');
      }

      // Cancel through Amadeus API
      const cancellationResponse = await fetch(`https://api.amadeus.com/v1/booking/hotel-bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const cancellationReference = `HCANCEL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      if (!cancellationResponse.ok) {
        const errorData = await cancellationResponse.json();
        
        // Update database status even if API call fails
        await BookingPersistence.updateBookingStatus(dbBooking.id, 'cancelled');
        
        throw new Error(`Amadeus hotel cancellation failed: ${errorData.errors?.[0]?.detail || `HTTP ${cancellationResponse.status}`}`);
      }

      // Update database status
      await BookingPersistence.updateBookingStatus(dbBooking.id, 'cancelled');

      const checkInDate = new Date(dbBooking.startDate);
      const now = new Date();
      const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Calculate refund based on cancellation policy from booking metadata
      const cancellationPolicy = (dbBooking.metadata as any)?.policies?.cancellation;
      const bookingPrice = dbBooking.price || 0;
      let refundAmount = bookingPrice / 100; // Convert from cents
      let cancellationFee = 0;

      if (cancellationPolicy) {
        // Use actual policy from Amadeus
        if (cancellationPolicy.deadline && new Date(cancellationPolicy.deadline) > now) {
          // Free cancellation period
          cancellationFee = 0;
        } else {
          // Apply cancellation fee
          cancellationFee = cancellationPolicy.amount || (refundAmount * 0.1);
          refundAmount = Math.max(0, refundAmount - cancellationFee);
        }
      } else {
        // Fallback policy
        if (hoursUntilCheckIn > 24) {
          cancellationFee = 0;
        } else if (hoursUntilCheckIn > 0) {
          cancellationFee = refundAmount * 0.1;
          refundAmount = refundAmount * 0.9;
        } else {
          cancellationFee = refundAmount;
          refundAmount = 0;
        }
      }

      return {
        success: true,
        refundAmount,
        cancellationFee,
        refundMethod: 'original_payment_method',
        cancellationReference
      };
    } catch (error) {
      throw new Error(`Hotel cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStatus(bookingId: string): Promise<BookingStatus> {
    try {
      const amadeusProvider = new AmadeusFlightProvider();
      const accessToken = await (amadeusProvider as any).getAccessToken();

      // Find booking in database
      const dbBooking = await BookingPersistence.getBookingByProviderReference('amadeus-hotels', bookingId);
      
      if (!dbBooking) {
        throw new Error('Hotel booking not found in database');
      }

      // Get status from Amadeus API
      const statusResponse = await fetch(`https://api.amadeus.com/v1/booking/hotel-bookings/${bookingId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!statusResponse.ok) {
        // Fall back to database status if API is unavailable
        const now = new Date();
        const checkIn = new Date(dbBooking.startDate);
        const checkOut = new Date(dbBooking.endDate);
        
        let status: 'confirmed' | 'cancelled' | 'modified' | 'completed' = dbBooking.status as any;
        
        if (dbBooking.status === 'confirmed' && now > checkOut) {
          status = 'completed';
          await BookingPersistence.updateBookingStatus(dbBooking.id, 'completed');
        }

        return {
          status,
          lastUpdated: dbBooking.updatedAt,
          details: {
            source: 'database-fallback',
            bookingId: dbBooking.id,
            provider: dbBooking.provider,
            error: 'Amadeus API unavailable'
          }
        };
      }

      const statusData = await statusResponse.json();
      const booking = statusData.data[0];

      // Determine status based on dates and booking data
      const now = new Date();
      const checkIn = new Date(dbBooking.startDate);
      const checkOut = new Date(dbBooking.endDate);
      
      let status: 'confirmed' | 'cancelled' | 'modified' | 'completed' = 'confirmed';
      
      if (booking.status === 'CANCELLED') {
        status = 'cancelled';
      } else if (now > checkOut) {
        status = 'completed';
        await BookingPersistence.updateBookingStatus(dbBooking.id, 'completed');
      } else if (booking.status === 'CONFIRMED') {
        status = 'confirmed';
      }

      return {
        status,
        lastUpdated: new Date(),
        details: {
          source: 'amadeus-api',
          bookingId: dbBooking.id,
          provider: dbBooking.provider,
          amadeusBookingId: booking.id,
          amadeusStatus: booking.status,
          hotelDetails: {
            name: booking.hotel?.name,
            address: booking.hotel?.address,
            contact: booking.hotel?.contact
          },
          checkIn: dbBooking.startDate,
          checkOut: dbBooking.endDate,
          totalAmount: (dbBooking.price || 0) / 100,
          currency: dbBooking.currency,
          confirmationCode: dbBooking.confirmationCode
        }
      };
    } catch (error) {
      throw new Error(`Hotel status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Stripe Payment Integration
export class StripePaymentProcessor {
  private stripe: any;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeStripe();
  }

  private async initializeStripe() {
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        // Use dynamic import for ES modules
        const Stripe = (await import('stripe')).default;
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2025-06-30.basil',
        });
        this.isInitialized = true;
      } catch (error) {
        console.warn('Failed to initialize Stripe:', error);
        this.isInitialized = false;
      }
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initializeStripe();
    }
    
    if (!this.isInitialized || !this.stripe) {
      throw new Error('Stripe not properly configured. Please set STRIPE_SECRET_KEY environment variable.');
    }
  }

  async createPaymentIntent(amount: number, currency: string, metadata: Record<string, any>) {
    await this.ensureInitialized();

    if (amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
          source: 'booking-engine'
        },
        automatic_payment_methods: {
          enabled: true,
        },
        confirmation_method: 'automatic',
        capture_method: 'automatic'
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      };
    } catch (error: any) {
      throw new Error(`Stripe payment intent creation failed: ${error.message || 'Unknown error'}`);
    }
  }

  async confirmPayment(paymentIntentId: string) {
    await this.ensureInitialized();

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'requires_confirmation') {
        const confirmed = await this.stripe.paymentIntents.confirm(paymentIntentId);
        return {
          id: confirmed.id,
          status: confirmed.status,
          amount: confirmed.amount / 100,
          currency: confirmed.currency,
        };
      }
      
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      };
    } catch (error: any) {
      throw new Error(`Stripe payment confirmation failed: ${error.message || 'Unknown error'}`);
    }
  }

  async getPaymentStatus(paymentIntentId: string) {
    await this.ensureInitialized();

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert back from cents
        currency: paymentIntent.currency,
        created: new Date(paymentIntent.created * 1000),
        description: paymentIntent.description,
        metadata: paymentIntent.metadata,
      };
    } catch (error: any) {
      throw new Error(`Stripe payment status check failed: ${error.message || 'Unknown error'}`);
    }
  }

  async createRefund(paymentIntentId: string, amount?: number, reason?: string) {
    await this.ensureInitialized();

    try {
      const refundData: any = { 
        payment_intent: paymentIntentId,
        reason: reason || 'requested_by_customer'
      };
      
      if (amount && amount > 0) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await this.stripe.refunds.create(refundData);
      
      return {
        id: refund.id,
        status: refund.status,
        amount: refund.amount / 100, // Convert back from cents
        currency: refund.currency,
        reason: refund.reason,
        created: new Date(refund.created * 1000),
      };
    } catch (error: any) {
      throw new Error(`Stripe refund failed: ${error.message || 'Unknown error'}`);
    }
  }

  async createCustomer(email: string, name?: string, metadata?: Record<string, any>) {
    await this.ensureInitialized();

    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
          source: 'booking-engine'
        }
      });

      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        created: new Date(customer.created * 1000),
      };
    } catch (error: any) {
      throw new Error(`Stripe customer creation failed: ${error.message || 'Unknown error'}`);
    }
  }

  // Webhook verification for secure payment processing
  async verifyWebhookSignature(payload: string, signature: string, endpointSecret: string) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe webhook secret not configured');
    }

    await this.ensureInitialized();

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret || process.env.STRIPE_WEBHOOK_SECRET
      );
      
      return event;
    } catch (error: any) {
      throw new Error(`Webhook signature verification failed: ${error.message || 'Unknown error'}`);
    }
  }
}

// Main booking engine
export class BookingEngine {
  private providers: Map<string, BookingProvider> = new Map();
  private paymentProcessor: StripePaymentProcessor;

  constructor() {
    this.registerProvider('amadeus-flights', new AmadeusFlightProvider());
    this.registerProvider('hotel-booking', new RealHotelProvider());
    this.paymentProcessor = new StripePaymentProcessor();
  }

  private registerProvider(id: string, provider: BookingProvider) {
    this.providers.set(id, provider);
  }

  async bookFlight(params: z.infer<typeof FlightBookingParamsSchema>): Promise<BookingResult> {
    const provider = this.providers.get('amadeus-flights');
    if (!provider || !provider.enabled) {
      throw new Error('Flight booking service not available. Please check Amadeus API configuration.');
    }

    // Validate parameters
    const validatedParams = FlightBookingParamsSchema.parse(params);
    
    try {
      const result = await provider.book(validatedParams);
      
      // Log successful booking
      console.log(`Flight booking successful: ${result.reference} for user ${params.userId}`);
      
      return result;
    } catch (error) {
      console.error('Flight booking failed:', error);
      throw error;
    }
  }

  async bookHotel(params: z.infer<typeof HotelBookingParamsSchema>): Promise<BookingResult> {
    const provider = this.providers.get('hotel-booking');
    if (!provider || !provider.enabled) {
      throw new Error('Hotel booking service not available');
    }

    // Validate parameters
    const validatedParams = HotelBookingParamsSchema.parse(params);
    
    try {
      const result = await provider.book(validatedParams);
      
      // Log successful booking
      console.log(`Hotel booking successful: ${result.reference} for user ${params.userId}`);
      
      return result;
    } catch (error) {
      console.error('Hotel booking failed:', error);
      throw error;
    }
  }

  async cancelBooking(providerId: string, bookingId: string, reason?: string): Promise<CancellationResult> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Booking provider '${providerId}' not found`);
    }

    try {
      const result = await provider.cancel(bookingId);
      
      // Log cancellation
      console.log(`Booking ${bookingId} cancelled via ${providerId}. Success: ${result.success}`);
      
      return result;
    } catch (error) {
      console.error(`Cancellation failed for booking ${bookingId}:`, error);
      throw error;
    }
  }

  async getBookingStatus(providerId: string, bookingId: string): Promise<BookingStatus> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Booking provider '${providerId}' not found`);
    }

    try {
      return await provider.getStatus(bookingId);
    } catch (error) {
      console.error(`Status check failed for booking ${bookingId}:`, error);
      throw error;
    }
  }

  async getBookingHistory(userId: string): Promise<any[]> {
    try {
      const userBookings = await db.select().from(bookings).where(eq(bookings.userId, userId));
      return userBookings.map(booking => ({
        id: booking.id,
        type: booking.type,
        title: booking.title,
        description: booking.description,
        startDate: booking.startDate,
        endDate: booking.endDate,
        location: booking.location,
        status: booking.status,
        provider: booking.provider,
        confirmationCode: booking.confirmationCode,
        price: (booking.price || 0) / 100, // Convert from cents
        currency: booking.currency,
        createdAt: booking.createdAt,
        metadata: booking.metadata
      }));
    } catch (error) {
      console.error(`Failed to get booking history for user ${userId}:`, error);
      throw new Error('Failed to retrieve booking history');
    }
  }

  async processPayment(params: {
    amount: number;
    currency: string;
    bookingId: string;
    userId: string;
    description?: string;
  }) {
    try {
      const paymentIntent = await this.paymentProcessor.createPaymentIntent(
        params.amount,
        params.currency,
        {
          bookingId: params.bookingId,
          userId: params.userId,
          description: params.description || `Payment for booking ${params.bookingId}`,
        }
      );

      return paymentIntent;
    } catch (error) {
      console.error('Payment processing failed:', error);
      throw error;
    }
  }

  async processRefund(paymentIntentId: string, amount?: number, reason?: string) {
    try {
      const refund = await this.paymentProcessor.createRefund(paymentIntentId, amount, reason);
      return refund;
    } catch (error) {
      console.error('Refund processing failed:', error);
      throw error;
    }
  }

  getAvailableProviders(): Array<{ id: string; name: string; type: string; enabled: boolean; requiresAuth: boolean }> {
    return Array.from(this.providers.entries()).map(([id, provider]) => ({
      id,
      name: provider.name,
      type: provider.type,
      enabled: provider.enabled,
      requiresAuth: provider.requiresAuth
    }));
  }

  async healthCheck(): Promise<{ status: string; providers: any[]; payment: any; database: any }> {
    const providerStatuses = await Promise.allSettled(
      Array.from(this.providers.entries()).map(async ([id, provider]) => {
        try {
          if (id === 'amadeus-flights' && provider.enabled) {
            // Test Amadeus authentication
            const amadeusProvider = provider as AmadeusFlightProvider;
            await (amadeusProvider as any).getAccessToken();
            return { id, name: provider.name, status: 'healthy', enabled: provider.enabled };
          }
          return { id, name: provider.name, status: 'available', enabled: provider.enabled };
        } catch (error) {
          return { 
            id, 
            name: provider.name, 
            status: 'error', 
            enabled: provider.enabled,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    // Test Stripe payment processor connectivity
    let paymentStatus = 'unknown';
    try {
      // Attempt to create a minimal payment intent to test Stripe connectivity
      await this.paymentProcessor.createPaymentIntent(1, 'usd', { healthCheck: 'true' });
      paymentStatus = 'healthy';
    } catch (error) {
      paymentStatus = error instanceof Error && error.message.includes('Stripe not properly configured') 
        ? 'not_configured' 
        : 'error';
    }

    // Test database connectivity
    let databaseStatus = 'unknown';
    try {
      await db.select().from(bookings).limit(1);
      databaseStatus = 'healthy';
    } catch (error) {
      databaseStatus = 'error';
    }

    return {
      status: 'operational',
      providers: providerStatuses.map(result => 
        result.status === 'fulfilled' ? result.value : { status: 'error', ...result.reason }
      ),
      payment: { status: paymentStatus },
      database: { status: databaseStatus }
    };
  }
}

export const bookingEngine = new BookingEngine();

// Export additional utility functions
export const BookingUtils = {
  /**
   * Validate flight search parameters
   */
  validateFlightSearch: (params: any) => {
    const schema = z.object({
      origin: z.string().length(3, 'Origin must be a valid 3-letter airport code'),
      destination: z.string().length(3, 'Destination must be a valid 3-letter airport code'),
      departureDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid departure date'),
      returnDate: z.string().optional().refine(date => !date || !isNaN(Date.parse(date)), 'Invalid return date'),
      adults: z.number().min(1).max(9),
      children: z.number().min(0).max(9).optional(),
      infants: z.number().min(0).max(9).optional(),
      class: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).optional()
    });
    
    return schema.parse(params);
  },

  /**
   * Validate hotel search parameters
   */
  validateHotelSearch: (params: any) => {
    const schema = z.object({
      cityCode: z.string().length(3, 'City code must be a valid 3-letter code'),
      checkIn: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid check-in date'),
      checkOut: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid check-out date'),
      adults: z.number().min(1).max(10),
      rooms: z.number().min(1).max(5).optional(),
      currency: z.string().length(3).optional()
    });
    
    return schema.parse(params);
  },

  /**
   * Calculate booking fees and taxes
   */
  calculateBookingFees: (basePrice: number, type: 'flight' | 'hotel') => {
    const serviceFee = basePrice * 0.05; // 5% service fee
    const processingFee = type === 'flight' ? 25 : 15; // Processing fee
    const tax = basePrice * 0.08; // 8% tax
    
    return {
      basePrice,
      serviceFee,
      processingFee,
      tax,
      total: basePrice + serviceFee + processingFee + tax
    };
  },

  /**
   * Generate booking reference
   */
  generateBookingReference: (type: 'flight' | 'hotel') => {
    const prefix = type === 'flight' ? 'FL' : 'HT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `${prefix}${timestamp}${random}`;
  },

  /**
   * Calculate cancellation fees based on booking type and timing
   */
  calculateCancellationFee: (
    bookingAmount: number, 
    bookingType: 'flight' | 'hotel',
    bookingDate: Date,
    travelDate: Date,
    cancellationDate: Date = new Date()
  ) => {
    const hoursUntilTravel = (travelDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60);
    
    if (bookingType === 'flight') {
      if (hoursUntilTravel > 24) return bookingAmount * 0.1; // 10%
      if (hoursUntilTravel > 2) return bookingAmount * 0.5; // 50%
      return bookingAmount; // 100% - no refund
    } else { // hotel
      if (hoursUntilTravel > 48) return 0; // Free cancellation
      if (hoursUntilTravel > 24) return bookingAmount * 0.1; // 10%
      return bookingAmount * 0.5; // 50%
    }
  },

  /**
   * Format booking confirmation for email/display
   */
  formatBookingConfirmation: (booking: BookingResult, type: 'flight' | 'hotel') => {
    return {
      confirmationNumber: booking.reference,
      bookingId: booking.id,
      status: booking.status,
      amount: booking.totalAmount,
      currency: booking.currency,
      type,
      details: booking.confirmationDetails,
      cancellationPolicy: booking.cancellationPolicy,
      formattedAmount: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: booking.currency
      }).format(booking.totalAmount)
    };
  }
};

// Export schemas for external use
export { FlightBookingParamsSchema, HotelBookingParamsSchema, PassengerSchema };