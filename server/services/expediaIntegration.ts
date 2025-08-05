/**
 * Expedia Affiliate Integration
 * Makes affiliate links feel like native booking
 */

interface ExpediaSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults?: number;
  children?: number;
  rooms?: number;
}

interface ExpediaHotel {
  id: string;
  name: string;
  image: string;
  rating: number;
  price: string;
  amenities: string[];
  bookingUrl: string;
}

export class ExpediaIntegration {
  private affiliateId: string;
  private baseUrl = 'https://www.expedia.com';
  
  constructor(affiliateId: string) {
    this.affiliateId = affiliateId;
  }

  /**
   * Generate Expedia search URL with affiliate tracking
   */
  generateHotelSearchUrl(params: ExpediaSearchParams): string {
    const searchParams = new URLSearchParams({
      // Destination
      'destination': params.destination,
      
      // Dates
      'startDate': params.checkIn,
      'endDate': params.checkOut,
      
      // Guests
      'adults': (params.adults || 2).toString(),
      'children': (params.children || 0).toString(),
      'rooms': (params.rooms || 1).toString(),
      
      // Affiliate tracking
      'affid': this.affiliateId,
      'afflid': 'remvana', // Your custom tracking ID
    });

    return `${this.baseUrl}/Hotel-Search?${searchParams.toString()}`;
  }

  /**
   * Generate flight search URL
   */
  generateFlightSearchUrl(from: string, to: string, depart: string, returnDate?: string): string {
    const tripType = returnDate ? 'Roundtrip' : 'OneWay';
    
    const searchParams = new URLSearchParams({
      'mode': 'search',
      'trip': tripType,
      'leg1': `from:${from},to:${to},departure:${depart}TANYT`,
      'passengers': 'adults:1,infantinlap:N',
      'affid': this.affiliateId,
    });

    if (returnDate) {
      searchParams.append('leg2', `from:${to},to:${from},departure:${returnDate}TANYT`);
    }

    return `${this.baseUrl}/Flights-Search?${searchParams.toString()}`;
  }

  /**
   * Generate flight + hotel package URL (Bundle & Save)
   * Packages typically save 20-30% and earn higher commissions
   */
  generatePackageUrl(params: {
    from: string;
    to: string;
    depart: string;
    returnDate: string;
    adults?: number;
    rooms?: number;
  }): string {
    const searchParams = new URLSearchParams({
      // Package type
      'packageType': 'fh', // flight + hotel
      
      // Flight details
      'ftla': params.from,
      'ttla': params.to,
      'chkin': params.depart,
      'chkout': params.returnDate,
      
      // Travelers
      'adults': (params.adults || 2).toString(),
      'rooms': (params.rooms || 1).toString(),
      
      // Affiliate tracking
      'affid': this.affiliateId,
      'afflid': 'remvana_package',
      
      // UI preferences
      'showSavings': 'true',
      'sortType': 'PRICE',
    });

    return `${this.baseUrl}/Packages?${searchParams.toString()}`;
  }

  /**
   * Generate vacation rental search URL
   */
  generateVacationRentalUrl(params: ExpediaSearchParams): string {
    const searchParams = new URLSearchParams({
      'destination': params.destination,
      'startDate': params.checkIn,
      'endDate': params.checkOut,
      'adults': (params.adults || 2).toString(),
      'affid': this.affiliateId,
    });

    return `${this.baseUrl}/Vacation-Rentals?${searchParams.toString()}`;
  }

  /**
   * Calculate estimated savings for bundles
   */
  calculateBundleSavings(hotelPrice: number, flightPrice: number): {
    total: number;
    savings: number;
    percentage: number;
  } {
    const separate = hotelPrice + flightPrice;
    const bundleDiscount = 0.22; // Average 22% discount
    const bundlePrice = separate * (1 - bundleDiscount);
    
    return {
      total: Math.round(bundlePrice),
      savings: Math.round(separate - bundlePrice),
      percentage: Math.round(bundleDiscount * 100)
    };
  }

  /**
   * Create a tracking URL for analytics
   */
  createTrackingUrl(originalUrl: string, tripId?: string, userId?: string): string {
    // Add your own tracking parameters
    const url = new URL(originalUrl);
    
    if (tripId) url.searchParams.append('trip_id', tripId);
    if (userId) url.searchParams.append('user_ref', userId);
    
    // Add campaign tracking
    url.searchParams.append('utm_source', 'remvana');
    url.searchParams.append('utm_medium', 'app');
    url.searchParams.append('utm_campaign', 'travel_booking');
    
    return url.toString();
  }

  /**
   * Mock hotel data with Expedia URLs (for demo/development)
   * In production, you'd use a real hotel API for search
   */
  async searchHotels(params: ExpediaSearchParams): Promise<ExpediaHotel[]> {
    // This is where you'd call Amadeus or another API for real search
    // For now, return sample data with real Expedia links
    
    const baseSearchUrl = this.generateHotelSearchUrl(params);
    
    // Sample hotels (in production, get from real API)
    const sampleHotels: ExpediaHotel[] = [
      {
        id: '1',
        name: 'Luxury Downtown Hotel',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
        rating: 4.5,
        price: '$150',
        amenities: ['Free WiFi', 'Pool', 'Gym', 'Restaurant'],
        bookingUrl: baseSearchUrl
      },
      {
        id: '2',
        name: 'Cozy Boutique Inn',
        image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400',
        rating: 4.8,
        price: '$120',
        amenities: ['Free Breakfast', 'WiFi', 'Pet Friendly'],
        bookingUrl: baseSearchUrl
      },
      {
        id: '3',
        name: 'Budget Friendly Suites',
        image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=400',
        rating: 4.0,
        price: '$80',
        amenities: ['WiFi', 'Parking', 'Kitchen'],
        bookingUrl: baseSearchUrl
      }
    ];

    return sampleHotels;
  }
}

// Singleton instance
export const expediaService = new ExpediaIntegration(
  process.env.EXPEDIA_AFFILIATE_ID || 'your-affiliate-id'
);