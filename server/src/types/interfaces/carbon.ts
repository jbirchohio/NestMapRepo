// Unified CarbonFootprint interface that combines all required properties
export interface CarbonFootprint {
  // Primary carbon metrics
  totalEmissions: number; // kg CO2 - legacy property
  totalCO2kg: number; // kg CO2 - newer property
  
  // Detailed breakdown by category
  breakdown: {
    flights: number;
    hotels: number;
    localTransport: number;
    activities: number;
    meals: number;
    // Additional categories
    ground: number;
    accommodation: number;
  };
  
  // Performance metrics
  metrics: {
    co2PerKm: number;
    co2PerDay: number;
    offsetCost: number;
  };
  
  // ESG compliance tracking
  esgCompliance: {
    scope1: number; // Direct emissions
    scope2: number; // Indirect emissions from energy
    scope3: number; // Other indirect emissions
    certifications: string[];
    offsetPrograms: Array<{
      provider: string;
      type: string;
      cost: number;
      verified: boolean;
    }>;
  };
  
  // Comparison metrics
  comparison: {
    averageTrip: number;
    reductionPotential: number;
    offsetCost: number;
  };
  
  // Trend analysis
  trends: {
    vsLastTrip: number;
    vsOrgAverage: number;
    improvementAreas: string[];
  };
  
  // Recommendations
  recommendations: CarbonReduction[];
}

export interface CarbonReduction {
  category: string;
  action: string;
  potentialSaving: number; // kg CO2
  implementation: 'easy' | 'moderate' | 'difficult';
  costImpact: 'none' | 'low' | 'medium' | 'high';
}

// Export legacy interface for backward compatibility
export interface LegacyCarbonFootprint {
  totalEmissions: number;
  breakdown: {
    flights: number;
    hotels: number;
    localTransport: number;
    activities: number;
    meals: number;
  };
  comparison: {
    averageTrip: number;
    reductionPotential: number;
    offsetCost: number;
  };
  recommendations: CarbonReduction[];
}

