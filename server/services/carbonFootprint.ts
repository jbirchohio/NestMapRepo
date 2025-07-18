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
        const distance = this.calculateFlightDistance(flight.origin, flight.destination);
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

  private calculateFlightDistance(origin: string, destination: string): number {
    // Mock distance calculation - in real implementation, use actual coordinates
    const distances: Record<string, number> = {
      'JFK-LAX': 3944,
      'LAX-JFK': 3944,
      'JFK-LHR': 5585,
      'LHR-JFK': 5585
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
}

export const carbonFootprintService = new CarbonFootprintService();
