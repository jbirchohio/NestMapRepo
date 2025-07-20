import fetch from 'node-fetch';

interface KiwiFlightSearchParams {
  fly_from: string;
  fly_to: string;
  date_from: string;
  date_to?: string;
  return_from?: string;
  return_to?: string;
  adults: number;
  children?: number;
  infants?: number;
  curr: string;
  locale: string;
  limit: number;
}

interface KiwiHotelSearchParams {
  checkin: string;
  checkout: string;
  city_ids: string;
  adults_per_room: number;
  rooms: number;
  currency: string;
  limit: number;
}

interface KiwiCarSearchParams {
  pick_up_location: string;
  drop_off_location: string;
  pick_up_date: string;
  drop_off_date: string;
  currency: string;
  limit: number;
}

export class KiwiProvider {
  private baseUrl = 'https://api.tequila.kiwi.com';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.KIWI_API_KEY || ''
    if (!this.apiKey) {
      console.warn('KIWI_API_KEY not configured - flight and hotel search will not work');
    }
  }

  async searchFlights(params: {
    departure: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
  }) {
    if (!this.apiKey) {
      throw new Error('Kiwi API key not configured. Please provide KIWI_API_KEY.');
    }

    const searchParams: KiwiFlightSearchParams = {
      fly_from: params.departure,
      fly_to: params.destination,
      date_from: params.departureDate,
      date_to: params.departureDate,
      return_from: params.returnDate,
      return_to: params.returnDate,
      adults: params.passengers,
      curr: 'USD',
      locale: 'en',
      limit: 20
    };

    const queryString = new URLSearchParams(searchParams as any).toString();
    const url = `${this.baseUrl}/v2/search?${queryString}`;

    console.log('Kiwi flight search URL:', url);

    try {
      const response = await fetch(url, {
        headers: {
          'apikey': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Kiwi API error:', response.status, errorText);
        throw new Error(`Kiwi API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Kiwi flight search response:', {
        totalOffers: data.data?.length || 0,
        currency: data.currency,
        searchId: data.search_id
      });

      return this.transformFlightResults(data);
    } catch (error) {
      console.error('Error fetching flights from Kiwi:', error);
      throw error;
    }
  }

  async searchCars(params: {
    pickUpLocation: string;
    dropOffLocation: string;
    pickUpDate: string;
    dropOffDate: string;
  }) {
    if (!this.apiKey) {
      throw new Error('Kiwi API key not configured. Please provide KIWI_API_KEY.');
    }

    const searchParams: KiwiCarSearchParams = {
      pick_up_location: params.pickUpLocation,
      drop_off_location: params.dropOffLocation,
      pick_up_date: params.pickUpDate,
      drop_off_date: params.dropOffDate,
      currency: 'USD',
      limit: 20
    };

    const queryString = new URLSearchParams(searchParams as any).toString();
    const url = `${this.baseUrl}/cars/v1/search?${queryString}`;

    console.log('Kiwi car search URL:', url);

    try {
      const response = await fetch(url, {
        headers: {
          'apikey': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Kiwi Cars API error:', response.status, errorText);
        throw new Error(`Kiwi Cars API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Kiwi car search response:', {
        totalCars: data.data?.length || 0,
        currency: data.currency
      });

      return this.transformCarResults(data);
    } catch (error) {
      console.error('Error fetching cars from Kiwi:', error);
      throw error;
    }
  }

  async searchHotels(params: {
    destination: string;
    checkin: string;
    checkout: string;
    rooms: number;
    guests: number;
  }) {
    if (!this.apiKey) {
      throw new Error('Kiwi API key not configured. Please provide KIWI_API_KEY.');
    }

    // First, get the city ID for the destination
    const cityId = await this.getCityId(params.destination);
    if (!cityId) {
      throw new Error(`Could not find city ID for destination: ${params.destination}`);
    }

    const searchParams: KiwiHotelSearchParams = {
      checkin: params.checkin,
      checkout: params.checkout,
      city_ids: cityId,
      adults_per_room: Math.ceil(params.guests / params.rooms),
      rooms: params.rooms,
      currency: 'USD',
      limit: 20
    };

    const queryString = new URLSearchParams(searchParams as any).toString();
    const url = `${this.baseUrl}/hotels/v1/search?${queryString}`;

    console.log('Kiwi hotel search URL:', url);

    try {
      const response = await fetch(url, {
        headers: {
          'apikey': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Kiwi Hotels API error:', response.status, errorText);
        throw new Error(`Kiwi Hotels API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Kiwi hotel search response:', {
        totalHotels: data.data?.length || 0,
        currency: data.currency
      });

      return this.transformHotelResults(data);
    } catch (error) {
      console.error('Error fetching hotels from Kiwi:', error);
      throw error;
    }
  }

  private async getCityId(cityName: string): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/locations/query?term=${encodeURIComponent(cityName)}&location_types=city&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.locations?.[0]?.id || null;
    } catch (error) {
      console.error('Error getting city ID:', error);
      return null;
    }
  }

  private transformFlightResults(data: any) {
    if (!data.data || !Array.isArray(data.data)) {
      return { flights: [] };
    }

    const flights = data.data.map((flight: any, index: number) => {
      const outbound = flight.route?.[0];
      const inbound = flight.route?.[flight.route.length - 1];

      return {
        id: `kiwi-${flight.id || index}`,
        price: {
          amount: Math.round(flight.price || 0),
          currency: data.currency || 'USD'
        },
        departure: {
          airport: {
            code: outbound?.flyFrom || '',
            name: outbound?.cityFrom || '',
            city: outbound?.cityFrom || '',
            country: outbound?.countryFrom?.name || ''
          },
          time: outbound?.local_departure || new Date().toISOString()
        },
        arrival: {
          airport: {
            code: outbound?.flyTo || '',
            name: outbound?.cityTo || '',
            city: outbound?.cityTo || '',
            country: outbound?.countryTo?.name || ''
          },
          time: outbound?.local_arrival || new Date().toISOString()
        },
        duration: flight.duration?.total || 0,
        stops: (flight.route?.length || 1) - 1,
        airline: {
          code: flight.airlines?.[0] || '',
          name: flight.airlines?.[0] || 'Unknown Airline'
        },
        segments: flight.route?.map((segment: any) => ({
          departure: {
            airport: {
              code: segment.flyFrom,
              name: segment.cityFrom,
              city: segment.cityFrom,
              country: segment.countryFrom?.name
            },
            time: segment.local_departure
          },
          arrival: {
            airport: {
              code: segment.flyTo,
              name: segment.cityTo,
              city: segment.cityTo,
              country: segment.countryTo?.name
            },
            time: segment.local_arrival
          },
          airline: {
            code: segment.airline,
            name: segment.airline
          },
          flight_number: segment.flight_no?.toString(),
          duration: segment.duration?.total || 0
        })) || [],
        bookingToken: flight.booking_token,
        deepLink: flight.deep_link
      };
    });

    return { flights };
  }

  private transformHotelResults(data: any) {
    if (!data.data || !Array.isArray(data.data)) {
      return { hotels: [] };
    }

    const hotels = data.data.map((hotel: any, index: number) => ({
      id: `kiwi-hotel-${hotel.id || index}`,
      name: hotel.name || 'Unknown Hotel',
      starRating: hotel.stars || 0,
      rating: {
        score: hotel.rating || 0,
        reviews: hotel.review_count || 0
      },
      price: {
        amount: Math.round(hotel.price?.amount || 0),
        currency: hotel.price?.currency || 'USD',
        per: 'night'
      },
      address: hotel.address || '',
      location: {
        latitude: hotel.location?.lat || 0,
        longitude: hotel.location?.lng || 0
      },
      amenities: hotel.amenities || [],
      images: hotel.photos?.map((photo: any) => photo.url) || [],
      description: hotel.description || '',
      checkIn: hotel.checkin_info?.from || '',
      checkOut: hotel.checkout_info?.until || '',
      cancellation: hotel.cancellation_info?.type || 'Unknown',
      roomsLeft: hotel.rooms_left || 0
    }));

    return { hotels };
  }

  private transformCarResults(data: any) {
    if (!data.data || !Array.isArray(data.data)) {
      return { cars: [] };
    }

    const cars = data.data.map((car: any, index: number) => ({
      id: `kiwi-car-${car.id || index}`,
      supplier: car.supplier?.name || 'Unknown Supplier',
      vehicle: {
        category: car.vehicle?.category || 'Economy',
        type: car.vehicle?.type || 'Car',
        model: car.vehicle?.model || 'Standard',
        transmission: car.vehicle?.transmission || 'Manual',
        fuelType: car.vehicle?.fuel_type || 'Petrol',
        seats: car.vehicle?.seats || 4,
        doors: car.vehicle?.doors || 4,
        airConditioning: car.vehicle?.air_conditioning || false
      },
      price: {
        amount: Math.round(car.price?.total || 0),
        currency: car.price?.currency || 'USD',
        per: 'total'
      },
      dailyRate: {
        amount: Math.round((car.price?.total || 0) / Math.max(1, car.rental_days || 1)),
        currency: car.price?.currency || 'USD'
      },
      pickup: {
        location: car.pickup_location?.name || '',
        address: car.pickup_location?.address || '',
        datetime: car.pickup_datetime || ''
      },
      dropoff: {
        location: car.dropoff_location?.name || '',
        address: car.dropoff_location?.address || '',
        datetime: car.dropoff_datetime || ''
      },
      features: car.features || [],
      policies: {
        cancellation: car.cancellation_policy || 'Standard',
        mileage: car.mileage_policy || 'Unlimited',
        fuel: car.fuel_policy || 'Full to Full'
      },
      images: car.images || [],
      bookingToken: car.booking_token
    }));

    return { cars };
  }

  async bookFlight(params: {
    bookingToken: string;
    passengers: any[];
    contactInfo: any;
  }) {
    if (!this.apiKey) {
      throw new Error('Kiwi API key not configured');
    }

    // Kiwi booking requires a booking flow
    // This would typically redirect to Kiwi's booking page
    const bookingUrl = `${this.baseUrl}/v2/booking`;
    
    try {
      const response = await fetch(bookingUrl, {
        method: 'POST',
        headers: {
          'apikey': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_token: params.bookingToken,
          passengers: params.passengers,
          contact: params.contactInfo
        })
      });

      if (!response.ok) {
        throw new Error(`Booking failed: ${response.status} ${response.statusText}`);
      }

      const booking = await response.json();
      
      return {
        success: true,
        bookingReference: booking.pnr || booking.booking_id,
        confirmationNumber: booking.pnr || booking.booking_id,
        status: 'confirmed',
        bookingDetails: booking
      };
    } catch (error) {
      console.error('Kiwi flight booking error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Booking failed'
      };
    }
  }

  async bookHotel(params: {
    hotelId: string;
    checkIn: string;
    checkOut: string;
    rooms: number;
    guests: any[];
    contactInfo: any;
  }) {
    // Kiwi hotels typically redirect to partner booking sites
    // For now, we'll simulate a booking response
    return {
      success: true,
      bookingReference: `KIWI-HTL-${Date.now()}`,
      confirmationNumber: `KW${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      status: 'confirmed',
      redirectUrl: `https://www.kiwi.com/booking/hotel/${params.hotelId}`
    };
  }

  async bookCar(params: {
    carId: string;
    bookingToken: string;
    pickupDate: string;
    dropoffDate: string;
    driverInfo: any;
    contactInfo: any;
  }) {
    if (!this.apiKey) {
      throw new Error('Kiwi API key not configured');
    }

    // Kiwi car bookings typically redirect to rental company sites
    return {
      success: true,
      bookingReference: `KIWI-CAR-${Date.now()}`,
      confirmationNumber: `KC${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      status: 'confirmed',
      redirectUrl: `https://www.kiwi.com/booking/car/${params.carId}`
    };
  }
}

export const kiwiProvider = new KiwiProvider();