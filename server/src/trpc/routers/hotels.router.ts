import { z } from 'zod';
import { router, protectedProcedure } from './_base.router';
import { logger } from '../../utils/logger.js';

// Validation schemas
const hotelSearchSchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-in date must be in YYYY-MM-DD format'),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-out date must be in YYYY-MM-DD format'),
  guests: z.object({
    adults: z.number().min(1).default(1),
    children: z.number().min(0).default(0),
    rooms: z.number().min(1).default(1),
  }),
  filters: z.object({
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    stars: z.array(z.number().min(1).max(5)).optional(),
    amenities: z.array(z.string()).optional(),
  }).optional(),
});

const hotelBookSchema = z.object({
  hotelId: z.string().min(1, 'Hotel ID is required'),
  roomTypeId: z.string().min(1, 'Room type ID is required'),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-in date must be in YYYY-MM-DD format'),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-out date must be in YYYY-MM-DD format'),
  guests: z.array(z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(1, 'Phone number is required'),
    isPrimary: z.boolean().default(false),
  })),
  specialRequests: z.string().optional(),
  paymentMethod: z.object({
    type: z.enum(['credit_card', 'invoice', 'direct_billing']),
    token: z.string().optional(), // For saved payment methods
    card: z.object({
      number: z.string().min(1, 'Card number is required'),
      expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Expiry must be in MM/YY format'),
      cvc: z.string().min(3, 'CVC is required'),
      name: z.string().min(1, 'Cardholder name is required'),
    }).optional(),
  }),
});

export const hotelsRouter = router({
  search: protectedProcedure
    .input(hotelSearchSchema)
    .mutation(async ({ input }) => {
      try {
        // TODO: Replace with actual hotel API integration
        // This is a mock implementation
        const mockHotels = [
          {
            id: 'hotel-1',
            name: 'Luxury Grand Hotel',
            location: input.destination || 'City Center',
            rating: 4.7,
            stars: 5,
            pricePerNight: 299,
            currency: 'USD',
            amenities: ['Free WiFi', 'Swimming Pool', 'Spa', 'Fitness Center', 'Restaurant'],
            images: [
              'https://example.com/hotel1-1.jpg',
              'https://example.com/hotel1-2.jpg',
            ],
            rooms: [
              {
                id: 'room-1',
                type: 'Deluxe King Room',
                maxOccupancy: 2,
                price: 299,
                refundable: true,
                breakfastIncluded: true,
                available: 5,
              },
              {
                id: 'room-2',
                type: 'Executive Suite',
                maxOccupancy: 3,
                price: 499,
                refundable: true,
                breakfastIncluded: true,
                available: 2,
              },
            ],
          },
          // Add more mock hotels as needed
        ];

        // Apply filters if provided
        let filteredHotels = [...mockHotels];
        
        if (input.filters) {
          if (input.filters.minPrice !== undefined) {
            filteredHotels = filteredHotels.filter(
              hotel => hotel.pricePerNight >= (input.filters?.minPrice || 0)
            );
          }
          
          if (input.filters.maxPrice !== undefined) {
            filteredHotels = filteredHotels.filter(
              hotel => hotel.pricePerNight <= (input.filters?.maxPrice || Infinity)
            );
          }
          
          if (input.filters.stars?.length) {
            filteredHotels = filteredHotels.filter(
              hotel => input.filters?.stars?.includes(hotel.stars)
            );
          }
        }

        return {
          success: true,
          data: {
            hotels: filteredHotels,
            searchParams: input,
            totalResults: filteredHotels.length,
          },
        };
      } catch (error: unknown) {
        logger.error('Hotel search error:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to search for hotels'
        );
      }
    }),

  getHotel: protectedProcedure
    .input(z.object({
      hotelId: z.string().min(1, 'Hotel ID is required'),
    }))
    .query(async ({ input }) => {
      try {
        // TODO: Replace with actual hotel API integration
        // This is a mock implementation
        const mockHotel = {
          id: input.hotelId,
          name: 'Luxury Grand Hotel',
          description: 'Experience unparalleled luxury in the heart of the city. Our 5-star hotel offers world-class amenities and exceptional service.',
          address: '123 Luxury Avenue, City Center',
          location: {
            lat: 40.7128,
            lng: -74.0060,
            address: '123 Luxury Avenue, City Center',
          },
          rating: 4.7,
          stars: 5,
          amenities: [
            'Free WiFi', 'Swimming Pool', 'Spa', 'Fitness Center', 'Restaurant',
            'Room Service', '24-Hour Front Desk', 'Business Center', 'Laundry Service'
          ],
          images: [
            { url: 'https://example.com/hotel1-1.jpg', caption: 'Hotel Exterior' },
            { url: 'https://example.com/hotel1-2.jpg', caption: 'Lobby' },
            { url: 'https://example.com/hotel1-3.jpg', caption: 'Swimming Pool' },
            { url: 'https://example.com/hotel1-4.jpg', caption: 'Restaurant' },
          ],
          policies: {
            checkIn: '3:00 PM',
            checkOut: '12:00 PM',
            cancellation: 'Free cancellation up to 24 hours before check-in',
            pets: 'Pets not allowed',
            paymentMethods: ['Visa', 'MasterCard', 'American Express', 'Discover'],
          },
          rooms: [
            {
              id: 'room-1',
              type: 'Deluxe King Room',
              description: 'Spacious room with a king-size bed and city view',
              maxOccupancy: 2,
              size: 35, // m²
              bedType: '1 King Bed',
              price: 299,
              currency: 'USD',
              refundable: true,
              freeCancellation: true,
              breakfastIncluded: true,
              available: 5,
              amenities: ['Air Conditioning', 'TV', 'Minibar', 'Safe', 'Coffee Maker'],
              images: [
                'https://example.com/room1-1.jpg',
                'https://example.com/room1-2.jpg',
              ],
            },
            // Add more room types as needed
          ],
        };

        return {
          success: true,
          data: mockHotel,
        };
      } catch (error) {
        logger.error('Get hotel error:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to get hotel details'
        );
      }
    }),

  book: protectedProcedure
    .input(hotelBookSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        // TODO: Replace with actual hotel booking API integration
        // This is a mock implementation
        const bookingReference = `HOTEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // In a real implementation, you would:
        // 1. Validate the booking details
        // 2. Process payment
        // 3. Create the booking with the hotel provider
        // 4. Save the booking to your database
        
        // Mock booking response
        const bookingDetails = {
          bookingId: bookingReference,
          hotelId: input.hotelId,
          roomTypeId: input.roomTypeId,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          guests: input.guests,
          totalPrice: 299 * (new Date(input.checkOut).getDate() - new Date(input.checkIn).getDate()),
          currency: 'USD',
          status: 'confirmed',
          confirmationNumber: bookingReference,
          cancellationPolicy: 'Free cancellation until 24 hours before check-in',
        };

        // Save to database (commented out as this is a mock)
        // await db.insert(bookings).values({
        //   id: uuidv4(),
        //   userId: ctx.user.id,
        //   type: 'hotel',
        //   title: 'Luxury Grand Hotel - Deluxe King Room',
        //   description: `Hotel booking for ${input.guests.length} guests`,
        //   startDate: new Date(input.checkIn),
        //   endDate: new Date(input.checkOut),
        //   location: '123 Luxury Avenue, City Center',
        //   status: 'confirmed',
        //   confirmationCode: bookingReference,
        //   provider: 'mock-hotel-api',
        //   providerReferenceId: bookingReference,
        //   price: bookingDetails.totalPrice * 100, // Convert to cents
        //   currency: 'USD',
        //   metadata: {
        //     bookingDetails,
        //     guests: input.guests,
        //     specialRequests: input.specialRequests,
        //   },
        // });

        return {
          success: true,
          data: bookingDetails,
        };
      } catch (error: unknown) {
        logger.error('Hotel booking error:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to book hotel'
        );
      }
    }),

  cancelBooking: protectedProcedure
    .input(z.object({
      bookingId: z.string().min(1, 'Booking ID is required'),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        // TODO: Implement actual cancellation with the hotel API
        // This is a mock implementation
        
        // In a real implementation, you would:
        // 1. Verify the booking exists and belongs to the user
        // 2. Check cancellation policy
        // 3. Process cancellation with the hotel provider
        // 4. Update the booking status in your database
        
        return {
          success: true,
          data: {
            bookingId: input.bookingId,
            status: 'cancelled',
            cancellationTime: new Date().toISOString(),
            refundAmount: 0, // Would be calculated based on cancellation policy
            cancellationNumber: `CXL-${Date.now()}`,
          },
        };
      } catch (error) {
        logger.error('Cancel hotel booking error:', error);
        throw new Error(
          error instanceof Error ? error.message : 'Failed to cancel hotel booking'
        );
      }
    }),
});
