import { z } from 'zod';
import { router, protectedProcedure } from './_base.router';
import { logger } from '../../utils/logger.js';

// Validation schemas
const flightSearchSchema = z.object({
  origin: z.string().length(3, 'Origin must be a 3-letter airport code'),
  destination: z.string().length(3, 'Destination must be a 3-letter airport code'),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  passengers: z.number().min(1).max(9).default(1),
  cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy'),
});

const flightBookSchema = z.object({
  offerId: z.string().min(1, 'Offer ID is required'),
  passengers: z.array(z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(1, 'Phone number is required'),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    gender: z.enum(['m', 'f', 'x']),
    title: z.enum(['mr', 'mrs', 'ms', 'miss', 'dr']),
  })),
  loyaltyProgrammeAccount: z.object({
    airlineIataCode: z.string().length(2, 'Airline IATA code must be 2 characters'),
    accountNumber: z.string().min(1, 'Account number is required'),
  }).optional(),
});

// Duffel API integration helper
const duffelApiCall = async (endpoint: string, options: any = {}) => {
  const duffelApiKey = process.env.DUFFEL_API_KEY;
  
  if (!duffelApiKey) {
    throw new Error('Duffel API key not configured');
  }

  const response = await fetch(`https://api.duffel.com/air/${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${duffelApiKey}`,
      'Content-Type': 'application/json',
      'Duffel-Version': 'v1',
      'Accept': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Duffel API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
    );
  }

  return response.json();
};

export const flightsRouter = router({
  search: protectedProcedure
    .input(flightSearchSchema)
    .mutation(async ({ input }) => {
      try {
        const searchParams = {
          data: {
            ...input,
            slices: [
              {
                origin: input.origin,
                destination: input.destination,
                departure_date: input.departureDate,
              },
              ...(input.returnDate ? [{
                origin: input.destination,
                destination: input.origin,
                departure_date: input.returnDate,
              }] : []),
            ],
            passengers: Array(input.passengers).fill(0).map(() => ({
              type: 'adult',
            })),
            cabin_class: input.cabinClass,
          },
        };

        const response = await duffelApiCall('offer_requests', {
          method: 'POST',
          body: JSON.stringify(searchParams),
        });

        return {
          success: true,
          data: response.data,
        };
      } catch (error: unknown) {
        logger.error('Flight search error:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to search for flights'
        );
      }
    }),

  getOffer: protectedProcedure
    .input(z.object({
      offerId: z.string().min(1, 'Offer ID is required'),
    }))
    .query(async ({ input }) => {
      try {
        const response = await duffelApiCall(`offers/${input.offerId}?return_available_services=true`);
        return {
          success: true,
          data: response.data,
        };
      } catch (error) {
        logger.error('Get offer error:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to get flight offer'
        );
      }
    }),

  book: protectedProcedure
    .input(flightBookSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { offerId, passengers, loyaltyProgrammeAccount } = input;
        
        // First get the offer to validate it's still available
        const offer = await duffelApiCall(`offers/${offerId}`);
        
        if (!offer.data) {
          throw new Error('Flight offer not found or expired');
        }

        const bookingPayload = {
          data: {
            type: 'instant_booking',
            selected_offers: [offerId],
            payments: [
              {
                type: 'balance',
                amount: offer.data.total_amount,
                currency: offer.data.total_currency,
              },
            ],
            passengers: passengers.map((passenger, index) => ({
              title: passenger.title,
              born_on: passenger.dateOfBirth,
              gender: passenger.gender,
              family_name: passenger.lastName,
              given_name: passenger.firstName,
              email: passenger.email,
              phone_number: passenger.phone,
              fare_type: 'adult',
              ...(loyaltyProgrammeAccount && index === 0 ? {
                loyalty_programme_accounts: [{
                  account_number: loyaltyProgrammeAccount.accountNumber,
                  airline_iata_code: loyaltyProgrammeAccount.airlineIataCode,
                }],
              } : {}),
            })),
          },
        };

        const booking = await duffelApiCall('orders', {
          method: 'POST',
          body: JSON.stringify(bookingPayload),
        });

        // Log the booking in our database
        // This is where you'd save the booking to your database
        // await db.insert(bookings).values({
        //   id: uuidv4(),
        //   userId: ctx.user.id,
        //   type: 'flight',
        //   title: `${offer.data.owner.iata_code} ${offer.data.owner.name} Flight`,
        //   startDate: new Date(offer.data.slices[0].segments[0].departing_at),
        //   endDate: new Date(offer.data.slices[0].segments[offer.data.slices[0].segments.length - 1].arriving_at),
        //   status: 'confirmed',
        //   confirmationCode: booking.data.booking_reference,
        //   provider: 'duffel',
        //   providerReferenceId: booking.data.id,
        //   price: parseInt(offer.data.total_amount) * 100, // Convert to cents
        //   currency: offer.data.total_currency,
        //   metadata: {
        //     offer: offer.data,
        //     booking: booking.data,
        //   },
        // });

        return {
          success: true,
          data: {
            bookingId: booking.data.id,
            bookingReference: booking.data.booking_reference,
            amount: booking.data.total_amount,
            currency: booking.data.total_currency,
            // Add other relevant booking details
          },
        };
      } catch (error: unknown) {
        logger.error('Flight booking error:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to book flight'
        );
      }
    }),

  getStatus: protectedProcedure
    .input(z.object({
      flightNumber: z.string().min(1, 'Flight number is required'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    }))
    .query(async ({ input }) => {
      try {
        // This is a simplified example - you might want to use a different API for flight status
        const response = await duffelApiCall(`flight-status?flight_number=${input.flightNumber}&departure_date=${input.date}`);
        
        return {
          success: true,
          data: response.data,
        };
      } catch (error) {
        logger.error('Flight status error:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to get flight status'
        );
      }
    }),
});
