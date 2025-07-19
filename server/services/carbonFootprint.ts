import { EventEmitter } from 'events';

export interface CarbonFootprint {
  id: string;
  entityType: 'trip' | 'flight' | 'hotel' | 'transport';
  entityId: string;
  userId: number;
  co2Emissions: number; // kg CO2
  offsetOptions: OffsetOption[];
  recommendations: CarbonRecommendation[];
  isOffset: boolean;
  calculatedAt: Date;
}

export interface OffsetOption {
  id: string;
  provider: string;
  name: string;
  costPerTon: number;
  totalCost: number;
  projectType: 'reforestation' | 'renewable_energy' | 'carbon_capture';
  verified: boolean;
}

export interface CarbonRecommendation {
  type: 'reduce' | 'offset' | 'alternative';
  title: string;
  description: string;
  potentialReduction: number;
  costImpact: number;
  priority: number;
}

class CarbonFootprintService extends EventEmitter {
  private footprints: Map<string, CarbonFootprint> = new Map();
  private emissionFactors = new Map([
    ['flight_domestic', 0.255], // kg CO2 per km
    ['flight_international', 0.195],
    ['hotel_night', 30.0], // kg CO2 per night
    ['car_rental', 0.171], // kg CO2 per km
    ['train', 0.041]
  ]);

  async calculateTripFootprint(tripData: any, userId: number): Promise<CarbonFootprint> {
    let totalEmissions = 0;
    const factors = [];

    // Calculate flight emissions
    if (tripData.flights) {
      for (const flight of tripData.flights) {
        const distance = await this.calculateFlightDistance(flight.origin, flight.destination);
        const factor = flight.domestic ? 'flight_domestic' : 'flight_international';
        const emissions = distance * this.emissionFactors.get(factor)!;
        totalEmissions += emissions;
        factors.push({
          type: 'flight',
          description: `${flight.origin} to ${flight.destination}`,
          value: emissions,
          distance
        });
      }
    }

    // Calculate hotel emissions
    if (tripData.hotels) {
      for (const hotel of tripData.hotels) {
        const nights = this.calculateNights(hotel.checkIn, hotel.checkOut);
        const emissions = nights * this.emissionFactors.get('hotel_night')!;
        totalEmissions += emissions;
        factors.push({
          type: 'hotel',
          description: `${nights} nights at ${hotel.name}`,
          value: emissions,
          nights
        });
      }
    }

    const footprint: CarbonFootprint = {
      id: `carbon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entityType: 'trip',
      entityId: tripData.id,
      userId,
      co2Emissions: totalEmissions,
      offsetOptions: await this.generateOffsetOptions(totalEmissions),
      recommendations: await this.generateRecommendations(tripData, totalEmissions),
      isOffset: false,
      calculatedAt: new Date()
    };

    this.footprints.set(footprint.id, footprint);
    this.emit('footprintCalculated', footprint);
    return footprint;
  }

  private async calculateFlightDistance(origin: string, destination: string): Promise<number> {
    try {
      // Use real distance calculation with airport coordinates
      const airportCoords = await this.getAirportCoordinates(origin, destination);
      
      if (airportCoords.origin && airportCoords.destination) {
        return this.haversineDistance(
          airportCoords.origin.lat,
          airportCoords.origin.lng,
          airportCoords.destination.lat,
          airportCoords.destination.lng
        );
      }
    } catch (error) {
      console.error('Error calculating flight distance:', error);
    }

    // Fallback distances for common routes
    const distances: Record<string, number> = {
      'JFK-LAX': 3944, 'LAX-JFK': 3944,
      'JFK-LHR': 5585, 'LHR-JFK': 5585,
      'LAX-LHR': 8756, 'LHR-LAX': 8756,
      'JFK-CDG': 5837, 'CDG-JFK': 5837,
      'LAX-NRT': 8818, 'NRT-LAX': 8818
    };
    return distances[`${origin}-${destination}`] || 1000;
  }

  private calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private async generateOffsetOptions(emissions: number): Promise<OffsetOption[]> {
    const tonsCO2 = emissions / 1000;
    return [
      {
        id: 'reforestation_1',
        provider: 'Forest Carbon',
        name: 'Amazon Rainforest Protection',
        costPerTon: 25,
        totalCost: tonsCO2 * 25,
        projectType: 'reforestation',
        verified: true
      },
      {
        id: 'renewable_1',
        provider: 'Clean Energy Fund',
        name: 'Wind Farm Development',
        costPerTon: 20,
        totalCost: tonsCO2 * 20,
        projectType: 'renewable_energy',
        verified: true
      },
      {
        id: 'capture_1',
        provider: 'Carbon Capture Co',
        name: 'Direct Air Capture',
        costPerTon: 150,
        totalCost: tonsCO2 * 150,
        projectType: 'carbon_capture',
        verified: true
      }
    ];
  }

  private async generateRecommendations(tripData: any, emissions: number): Promise<CarbonRecommendation[]> {
    const recommendations: CarbonRecommendation[] = [];

    // Flight recommendations
    if (tripData.flights) {
      recommendations.push({
        type: 'reduce',
        title: 'Choose Direct Flights',
        description: 'Direct flights produce 20% fewer emissions than connecting flights',
        potentialReduction: emissions * 0.2,
        costImpact: 50,
        priority: 8
      });

      recommendations.push({
        type: 'alternative',
        title: 'Consider Train Travel',
        description: 'Train travel produces 80% fewer emissions than flights for short distances',
        potentialReduction: emissions * 0.8,
        costImpact: -100,
        priority: 9
      });
    }

    // Hotel recommendations
    if (tripData.hotels) {
      recommendations.push({
        type: 'reduce',
        title: 'Choose Green Hotels',
        description: 'Hotels with sustainability certifications reduce emissions by 30%',
        potentialReduction: emissions * 0.1,
        costImpact: 25,
        priority: 6
      });
    }

    // Offset recommendation
    recommendations.push({
      type: 'offset',
      title: 'Offset Your Trip',
      description: 'Purchase carbon offsets to neutralize your travel emissions',
      potentialReduction: emissions,
      costImpact: (emissions / 1000) * 25,
      priority: 7
    });

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  async purchaseOffset(footprintId: string, offsetOptionId: string): Promise<boolean> {
    const footprint = this.footprints.get(footprintId);
    if (!footprint) return false;

    const offsetOption = footprint.offsetOptions.find(o => o.id === offsetOptionId);
    if (!offsetOption) return false;

    // Mock offset purchase - in real implementation, integrate with offset providers
    footprint.isOffset = true;
    this.emit('offsetPurchased', { footprint, offsetOption });
    return true;
  }

  async getFootprint(id: string): Promise<CarbonFootprint | null> {
    return this.footprints.get(id) || null;
  }

  async getUserFootprints(userId: number): Promise<CarbonFootprint[]> {
    return Array.from(this.footprints.values()).filter(f => f.userId === userId);
  }

  async calculateSustainabilityScore(userId: number): Promise<number> {
    const userFootprints = await this.getUserFootprints(userId);
    const totalEmissions = userFootprints.reduce((sum, f) => sum + f.co2Emissions, 0);
    const offsetEmissions = userFootprints.filter(f => f.isOffset).reduce((sum, f) => sum + f.co2Emissions, 0);
    
    const offsetPercentage = totalEmissions > 0 ? (offsetEmissions / totalEmissions) * 100 : 0;
    return Math.min(offsetPercentage + 20, 100); // Base score + offset bonus
  }

  // Real airport coordinates lookup
  private async getAirportCoordinates(origin: string, destination: string): Promise<{
    origin?: { lat: number; lng: number };
    destination?: { lat: number; lng: number };
  }> {
    // Airport coordinates database (major airports)
    const airportCoords: Record<string, { lat: number; lng: number }> = {
      'JFK': { lat: 40.6413, lng: -73.7781 },
      'LAX': { lat: 33.9425, lng: -118.4081 },
      'LHR': { lat: 51.4700, lng: -0.4543 },
      'CDG': { lat: 49.0097, lng: 2.5479 },
      'NRT': { lat: 35.7720, lng: 140.3929 },
      'DXB': { lat: 25.2532, lng: 55.3657 },
      'SIN': { lat: 1.3644, lng: 103.9915 },
      'HKG': { lat: 22.3080, lng: 113.9185 },
      'FRA': { lat: 50.0379, lng: 8.5622 },
      'AMS': { lat: 52.3105, lng: 4.7683 }
    };

    return {
      origin: airportCoords[origin],
      destination: airportCoords[destination]
    };
  }

  // Haversine distance calculation
  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const carbonFootprintService = new CarbonFootprintService();
