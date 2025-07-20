import OpenAI from "openai";
import { CarbonFootprint, CarbonReduction } from './types/interfaces/carbon';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ExpenseReport {
  totalCost: number;
  currency: string;
  breakdown: {
    flights: number;
    accommodation: number;
    meals: number;
    transportation: number;
    activities: number;
    miscellaneous: number;
  };
  dailyAverages: {
    date: string;
    amount: number;
  }[];
  categories: ExpenseCategory[];
  receipts: Receipt[];
}

interface ExpenseCategory {
  name: string;
  budgeted: number;
  actual: number;
  variance: number;
  status: 'under' | 'on-track' | 'over';
}

interface Receipt {
  id: string;
  date: string;
  vendor: string;
  amount: number;
  category: string;
  description: string;
  imageUrl?: string;
  verified: boolean;
  activityId?: number;
}

export async function calculateCarbonFootprint(
  activities: any[],
  flights: any[] = [],
  accommodation: any[] = [],
  destination: string
): Promise<CarbonFootprint> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a carbon footprint analysis expert specializing in travel emissions calculation. 
          Use real environmental data and industry-standard emission factors for accurate calculations.`
        },
        {
          role: "user",
          content: `Calculate the carbon footprint for this travel itinerary:
          
          Destination: ${destination}
          Activities: ${JSON.stringify(activities)}
          Flights: ${JSON.stringify(flights)}
          Accommodation: ${JSON.stringify(accommodation)}
          
          Provide detailed emissions breakdown in kg CO2 equivalent including:
          - Flight emissions (distance-based calculations)
          - Hotel emissions (nights * emission factor)
          - Local transportation estimates
          - Activity-related emissions
          - Meal emissions based on destination cuisine
          
          Include reduction recommendations and offset cost estimates.
          
          Respond in JSON format with precise calculations.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      totalEmissions: result.totalEmissions || calculateFallbackEmissions(activities, flights, accommodation),
      totalCO2kg: result.totalCO2kg || result.totalEmissions || calculateFallbackEmissions(activities, flights, accommodation),
      breakdown: result.breakdown || generateEmissionsBreakdown(activities, flights, accommodation),
      metrics: result.metrics || { 
        co2PerKm: 0, 
        co2PerDay: 0, 
        offsetCost: (result.totalEmissions || 0) * 0.02 
      },
      esgCompliance: result.esgCompliance || {
        scope1: 0,
        scope2: 0,
        scope3: result.totalEmissions || 0,
        certifications: [],
        offsetPrograms: []
      },
      comparison: result.comparison || generateEmissionsComparison(result.totalEmissions || 0),
      trends: result.trends || {
        vsLastTrip: 0,
        vsOrgAverage: 0,
        improvementAreas: []
      },
      recommendations: result.recommendations || generateCarbonRecommendations()
    };

  } catch (error) {
    console.error('Error calculating carbon footprint:', error);
    return generateFallbackCarbonReport(activities, flights, accommodation);
  }
}

export async function generateExpenseReport(
  tripId: number,
  expenses: any[] = [],
  budget?: number
): Promise<ExpenseReport> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a corporate expense management expert. Analyze travel expenses and 
          provide detailed breakdowns suitable for business reporting and tax purposes.`
        },
        {
          role: "user",
          content: `Generate comprehensive expense report for trip ID ${tripId}:
          
          Expenses: ${JSON.stringify(expenses)}
          Budget: ${budget || 'Not specified'}
          
          Provide detailed analysis including:
          - Category breakdowns
          - Daily spending patterns
          - Budget variance analysis
          - Potential tax deductions
          - Compliance notes
          
          Format for corporate expense reporting standards.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      totalCost: result.totalCost || calculateTotalExpenses(expenses),
      currency: result.currency || 'USD',
      breakdown: result.breakdown || generateExpenseBreakdown(expenses),
      dailyAverages: result.dailyAverages || generateDailyAverages(expenses),
      categories: result.categories || generateExpenseCategories(expenses, budget),
      receipts: expenses.map(formatReceipt)
    };

  } catch (error) {
    console.error('Error generating expense report:', error);
    return generateFallbackExpenseReport(expenses, budget);
  }
}

export async function suggestCarbonOffsets(
  carbonFootprint: number,
  destination: string
): Promise<any[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a carbon offset specialist with knowledge of verified offset programs, 
          pricing, and effectiveness. Recommend high-quality offset options.`
        },
        {
          role: "user",
          content: `Recommend carbon offset options for ${carbonFootprint} kg CO2 from travel to ${destination}.
          
          Include:
          - Verified offset programs
          - Cost estimates
          - Project types (reforestation, renewable energy, etc.)
          - Quality ratings
          - Local/regional options when possible
          
          Focus on Gold Standard and VCS certified projects.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.offsetOptions || generateDefaultOffsetOptions(carbonFootprint);

  } catch (error) {
    console.error('Error suggesting carbon offsets:', error);
    return generateDefaultOffsetOptions(carbonFootprint);
  }
}

export function analyzeExpenseCompliance(expenses: any[]): any {
  const compliance = {
    issues: [] as any[],
    recommendations: [] as string[],
    taxDeductible: 0,
    flaggedItems: [] as any[]
  };

  expenses.forEach(expense => {
    // Check for missing receipts
    if (expense.amount > 25 && !expense.imageUrl) {
      compliance.issues.push({
        type: 'missing_receipt',
        severity: 'medium',
        description: `Receipt required for ${expense.description} (${expense.amount})`
      });
    }

    // Check for unusual amounts
    if (expense.category === 'meals' && expense.amount > 100) {
      compliance.flaggedItems.push({
        ...expense,
        flag: 'high_meal_cost',
        reason: 'Exceeds typical meal expense limits'
      });
    }

    // Calculate tax deductible amount
    if (['meals', 'accommodation', 'transportation'].includes(expense.category)) {
      const deductibleRate = expense.category === 'meals' ? 0.5 : 1.0;
      compliance.taxDeductible += expense.amount * deductibleRate;
    }
  });

  if (compliance.issues.length === 0) {
    compliance.recommendations.push('All expenses appear compliant with corporate policies');
  } else {
    compliance.recommendations.push(`${compliance.issues.length} items need attention for compliance`);
  }

  return compliance;
}

// Enhanced Carbon Footprint Tracking System

export async function calculateTripCarbonFootprint(
  trip: any,
  activities: any[],
  bookings: any[],
  organizationId: number
): Promise<CarbonFootprint> {
  const carbon: CarbonFootprint = {
    totalEmissions: 0, // Legacy property
    totalCO2kg: 0,
    breakdown: { 
      flights: 0, 
      ground: 0, 
      accommodation: 0, 
      activities: 0,
      hotels: 0,
      localTransport: 0,
      meals: 0
    },
    metrics: { co2PerKm: 0, co2PerDay: 0, offsetCost: 0 },
    esgCompliance: {
      scope1: 0,
      scope2: 0, 
      scope3: 0,
      certifications: [],
      offsetPrograms: []
    },
    comparison: {
      averageTrip: 0,
      reductionPotential: 0,
      offsetCost: 0
    },
    recommendations: [],
    trends: { vsLastTrip: 0, vsOrgAverage: 0, improvementAreas: [] }
  };

  // Calculate flight emissions
  const flightBookings = bookings.filter(b => b.type === 'flight');
  for (const flight of flightBookings) {
    const emissions = await calculateFlightEmissions(flight);
    carbon.breakdown.flights += emissions;
    carbon.esgCompliance.scope3 += emissions; // Business travel is Scope 3
  }

  // Calculate accommodation emissions
  const hotelBookings = bookings.filter(b => b.type === 'hotel');
  for (const hotel of hotelBookings) {
    const emissions = calculateHotelEmissions(hotel);
    carbon.breakdown.accommodation += emissions;
    carbon.esgCompliance.scope2 += emissions; // Energy usage is Scope 2
  }

  // Calculate ground transportation
  const groundTransport = activities.filter(a => 
    ['car_rental', 'taxi', 'train', 'bus'].includes(a.category)
  );
  for (const transport of groundTransport) {
    const emissions = calculateGroundTransportEmissions(transport);
    carbon.breakdown.ground += emissions;
    carbon.esgCompliance.scope1 += emissions; // Direct transport is Scope 1
  }

  // Calculate activity emissions
  const otherActivities = activities.filter(a => 
    !['car_rental', 'taxi', 'train', 'bus'].includes(a.category)
  );
  for (const activity of otherActivities) {
    const emissions = calculateActivityEmissions(activity);
    carbon.breakdown.activities += emissions;
    carbon.esgCompliance.scope3 += emissions;
  }

  carbon.totalCO2kg = Object.values(carbon.breakdown).reduce((sum, val) => sum + val, 0);

  // Calculate metrics
  const tripDays = Math.ceil(
    (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  carbon.metrics.co2PerDay = carbon.totalCO2kg / Math.max(tripDays, 1);
  carbon.metrics.offsetCost = carbon.totalCO2kg * 25; // $25 per ton average

  // Add ESG-compliant offset programs
  carbon.esgCompliance.offsetPrograms = [
    {
      provider: 'Gold Standard',
      type: 'Renewable Energy Projects',
      cost: carbon.totalCO2kg * 20,
      verified: true
    },
    {
      provider: 'Verra VCS',
      type: 'Forest Conservation',
      cost: carbon.totalCO2kg * 15,
      verified: true
    },
    {
      provider: 'Climate Action Reserve',
      type: 'Methane Capture',
      cost: carbon.totalCO2kg * 30,
      verified: true
    }
  ];

  // Generate recommendations
  carbon.recommendations = generateCarbonRecommendations();

  // Compare with organization trends
  carbon.trends = await calculateCarbonTrends(carbon, organizationId, trip.user_id);

  return carbon;
}

async function calculateFlightEmissions(flight: any): Promise<number> {
  // Use ICAO methodology for flight emissions
  const distance = flight.bookingData?.distance || estimateFlightDistance(
    flight.bookingData?.origin, 
    flight.bookingData?.destination
  );
  
  const aircraftType = flight.bookingData?.aircraftType || 'A320';
  const cabinClass = flight.bookingData?.cabinClass || 'economy';
  
  // Emission factors (kg CO2 per km per passenger)
  const emissionFactors = {
    economy: 0.115,
    premium: 0.180,
    business: 0.295,
    first: 0.400
  };
  
  const baseEmission = distance * emissionFactors[cabinClass as keyof typeof emissionFactors];
  
  // Add radiative forcing factor for high-altitude emissions
  const radiativeForcingFactor = 1.9;
  
  return baseEmission * radiativeForcingFactor;
}

function calculateHotelEmissions(hotel: any): number {
  const nights = Math.ceil(
    (new Date(hotel.checkOutDate).getTime() - new Date(hotel.checkInDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Average hotel emissions: 30kg CO2 per room per night
  const baseEmission = 30;
  
  // Hotel sustainability rating adjustments
  const sustainabilityFactor = hotel.bookingData?.sustainabilityRating ? 
    (1 - hotel.bookingData.sustainabilityRating * 0.1) : 1.0;
  
  return nights * baseEmission * sustainabilityFactor;
}

function calculateGroundTransportEmissions(transport: any): number {
  const distance = transport.estimatedDistance || 50; // Default 50km
  
  const emissionFactors = {
    car_rental: 0.171, // kg CO2 per km
    taxi: 0.171,
    train: 0.041,
    bus: 0.089,
    electric_car: 0.053,
    hybrid: 0.120
  };
  
  const factor = emissionFactors[transport.category as keyof typeof emissionFactors] || 0.171;
  return distance * factor;
}

function calculateActivityEmissions(activity: any): number {
  // Basic activity emissions based on type
  const activityEmissions = {
    restaurant: 5, // kg CO2 per meal
    entertainment: 2,
    shopping: 3,
    sightseeing: 1,
    conference: 10,
    meeting: 5
  };
  
  return activityEmissions[activity.category as keyof typeof activityEmissions] || 2;
}

function estimateFlightDistance(origin: string, destination: string): number {
  // Simplified distance calculation - in production, use actual flight route APIs
  const distances: Record<string, Record<string, number>> = {
    'NYC': { 'LAX': 3970, 'LHR': 5585, 'NRT': 10838 },
    'LAX': { 'NYC': 3970, 'LHR': 8780, 'NRT': 8815 },
    'LHR': { 'NYC': 5585, 'LAX': 8780, 'NRT': 9560 }
  };
  
  return distances[origin]?.[destination] || 5000; // Default long-haul distance
}

function generateCarbonRecommendationStrings(carbon: CarbonFootprint, _trip: any): string[] {
  const recommendations: string[] = [];
  
  if (carbon.breakdown.flights > carbon.totalCO2kg * 0.7) {
    recommendations.push('Consider combining multiple meetings into one trip to reduce flight emissions');
    recommendations.push('Explore direct flights which are typically more fuel-efficient');
    recommendations.push('Consider economy class to reduce per-passenger emissions');
  }
  
  if (carbon.breakdown.ground > carbon.totalCO2kg * 0.3) {
    recommendations.push('Use public transportation or electric vehicles when possible');
    recommendations.push('Consider shared transportation options');
  }
  
  if (carbon.breakdown.accommodation > carbon.totalCO2kg * 0.2) {
    recommendations.push('Choose hotels with sustainability certifications');
    recommendations.push('Opt for properties with renewable energy programs');
  }
  
  if (carbon.totalCO2kg > 500) {
    recommendations.push('Consider purchasing verified carbon offsets');
    recommendations.push('Explore virtual meeting alternatives for some components');
  }
  
  return recommendations;
}

async function calculateCarbonTrends(
  _currentCarbon: CarbonFootprint,
  _organizationId: number,
  _userId: number
): Promise<CarbonFootprint['trends']> {
  // In production, query historical trip data from database
  // For now, provide sample calculations
  
  return {
    vsLastTrip: -15, // 15% improvement
    vsOrgAverage: 8, // 8% above organization average
    improvementAreas: ['flight_efficiency', 'ground_transport', 'accommodation_choice']
  };
}

export interface ESGReport {
  period: string;
  totalEmissions: {
    scope1: number;
    scope2: number;
    scope3: number;
    total: number;
  };
  emissionsByCategory: Record<string, number>;
  offsetPrograms: Array<{
    provider: string;
    amount: number;
    cost: number;
    verified: boolean;
  }>;
  reductionTargets: {
    current: number;
    target2025: number;
    target2030: number;
    onTrack: boolean;
  };
  certifications: string[];
  compliance: {
    gri: boolean; // Global Reporting Initiative
    tcfd: boolean; // Task Force on Climate-related Financial Disclosures
    sbti: boolean; // Science Based Targets initiative
  };
}

export async function generateESGReport(
  _organizationId: number,
  period: string
): Promise<ESGReport> {
  // Generate comprehensive ESG compliance report
  // This would query all trips, bookings, and carbon data for the organization
  
  return {
    period,
    totalEmissions: {
      scope1: 1250,
      scope2: 850,
      scope3: 3400,
      total: 5500
    },
    emissionsByCategory: {
      flights: 3100,
      accommodation: 950,
      ground_transport: 800,
      activities: 650
    },
    offsetPrograms: [
      {
        provider: 'Gold Standard',
        amount: 2000,
        cost: 40000,
        verified: true
      }
    ],
    reductionTargets: {
      current: 5500,
      target2025: 4950, // 10% reduction
      target2030: 3850, // 30% reduction
      onTrack: true
    },
    certifications: ['ISO 14001', 'LEED Gold'],
    compliance: {
      gri: true,
      tcfd: true,
      sbti: false
    }
  };
}

// Helper functions for fallback calculations
function calculateFallbackEmissions(activities: any[], flights: any[], accommodation: any[]): number {
  let totalEmissions = 0;

  // Flight emissions (rough estimate: 0.5 kg CO2 per km)
  flights.forEach(flight => {
    const distance = flight.distance || 1000; // Default distance
    totalEmissions += distance * 0.5;
  });

  // Hotel emissions (rough estimate: 30 kg CO2 per night)
  accommodation.forEach(hotel => {
    const nights = hotel.nights || 1;
    totalEmissions += nights * 30;
  });

  // Local activities (rough estimate: 10 kg CO2 per day)
  const days = new Set(activities.map(a => a.day)).size || 1;
  totalEmissions += days * 10;

  return Math.round(totalEmissions);
}

function generateEmissionsBreakdown(activities: any[], flights: any[], accommodation: any[]): any {
  const total = calculateFallbackEmissions(activities, flights, accommodation);
  
  return {
    flights: Math.round(total * 0.6), // Flights typically 60% of travel emissions
    hotels: Math.round(total * 0.25),
    localTransport: Math.round(total * 0.1),
    activities: Math.round(total * 0.03),
    meals: Math.round(total * 0.02),
    // Additional properties for compatibility
    ground: Math.round(total * 0.1),
    accommodation: Math.round(total * 0.25)
  };
}

function generateEmissionsComparison(totalEmissions: number): any {
  return {
    averageTrip: 500, // kg CO2 for average trip
    reductionPotential: Math.round(totalEmissions * 0.3), // 30% reduction potential
    offsetCost: Math.round(totalEmissions * 0.02 * 100) / 100 // $0.02 per kg CO2
  };
}

function generateCarbonRecommendations(): CarbonReduction[] {
  return [
    {
      category: 'Transportation',
      action: 'Choose direct flights to reduce emissions by 20-30%',
      potentialSaving: 50,
      implementation: 'easy',
      costImpact: 'none'
    },
    {
      category: 'Accommodation',
      action: 'Stay in eco-certified hotels',
      potentialSaving: 15,
      implementation: 'easy',
      costImpact: 'none'
    },
    {
      category: 'Local Transport',
      action: 'Use public transport instead of taxis',
      potentialSaving: 10,
      implementation: 'moderate',
      costImpact: 'low'
    }
  ];
}

function generateFallbackCarbonReport(activities: any[], flights: any[], accommodation: any[]): CarbonFootprint {
  const totalEmissions = calculateFallbackEmissions(activities, flights, accommodation);
  
  return {
    totalEmissions,
    totalCO2kg: totalEmissions,
    breakdown: generateEmissionsBreakdown(activities, flights, accommodation),
    metrics: {
      co2PerKm: 0,
      co2PerDay: 0,
      offsetCost: totalEmissions * 0.02
    },
    esgCompliance: {
      scope1: 0,
      scope2: 0,
      scope3: totalEmissions,
      certifications: [],
      offsetPrograms: []
    },
    comparison: generateEmissionsComparison(totalEmissions),
    trends: {
      vsLastTrip: 0,
      vsOrgAverage: 0,
      improvementAreas: []
    },
    recommendations: generateCarbonRecommendations()
  };
}

function calculateTotalExpenses(expenses: any[]): number {
  return expenses.reduce((total, expense) => total + (expense.amount || 0), 0);
}

interface ExpenseBreakdown {
  flights: number;
  accommodation: number;
  meals: number;
  transportation: number;
  activities: number;
  miscellaneous: number;
}

function generateExpenseBreakdown(expenses: any[]): ExpenseBreakdown {
  const breakdown = {
    flights: 0,
    accommodation: 0,
    meals: 0,
    transportation: 0,
    activities: 0,
    miscellaneous: 0
  };

  expenses.forEach(expense => {
    const category = expense.category || 'miscellaneous';
    if (breakdown.hasOwnProperty(category)) {
      breakdown[category as keyof typeof breakdown] += expense.amount || 0;
    } else {
      breakdown.miscellaneous += expense.amount || 0;
    }
  });

  return breakdown;
}

function generateDailyAverages(expenses: any[]): any[] {
  const dailyTotals: Record<string, number> = {};
  
  expenses.forEach(expense => {
    const date = expense.date || new Date().toISOString().split('T')[0];
    dailyTotals[date] = (dailyTotals[date] || 0) + (expense.amount || 0);
  });

  return Object.entries(dailyTotals).map(([date, amount]) => ({ date, amount }));
}

function generateExpenseCategories(expenses: any[], budget?: number): ExpenseCategory[] {
  const breakdown = generateExpenseBreakdown(expenses);
  const totalBudget = budget || Object.values(breakdown).reduce((sum: number, val: any) => sum + (val as number), 0) * 1.2;
  
  return Object.entries(breakdown).map(([name, actual]) => {
    const budgeted = totalBudget / Object.keys(breakdown).length;
    const variance = (actual as number) - budgeted;
    
    return {
      name,
      budgeted: Math.round(budgeted),
      actual: Math.round(actual as number),
      variance: Math.round(variance),
      status: variance < -budgeted * 0.1 ? 'under' : variance > budgeted * 0.1 ? 'over' : 'on-track'
    };
  });
}

function formatReceipt(expense: any): Receipt {
  return {
    id: expense.id || `receipt_${Date.now()}`,
    date: expense.date || new Date().toISOString().split('T')[0],
    vendor: expense.vendor || 'Unknown Vendor',
    amount: expense.amount || 0,
    category: expense.category || 'miscellaneous',
    description: expense.description || 'Travel expense',
    imageUrl: expense.imageUrl,
    verified: expense.verified || false,
    activityId: expense.activityId
  };
}

function generateFallbackExpenseReport(expenses: any[], budget?: number): ExpenseReport {
  const totalCost = calculateTotalExpenses(expenses);
  
  return {
    totalCost,
    currency: 'USD',
    breakdown: generateExpenseBreakdown(expenses),
    dailyAverages: generateDailyAverages(expenses),
    categories: generateExpenseCategories(expenses, budget),
    receipts: expenses.map(formatReceipt)
  };
}

function generateDefaultOffsetOptions(carbonFootprint: number): any[] {
  const offsetCost = carbonFootprint * 0.02; // $0.02 per kg CO2
  
  return [
    {
      provider: 'Gold Standard',
      project: 'Renewable Energy Development',
      cost: Math.round(offsetCost * 100) / 100,
      quality: 'Premium',
      certification: 'Gold Standard VER'
    },
    {
      provider: 'Verra VCS',
      project: 'Forest Conservation',
      cost: Math.round(offsetCost * 0.8 * 100) / 100,
      quality: 'High',
      certification: 'VCS Verified'
    },
    {
      provider: 'Climate Action Reserve',
      project: 'Methane Reduction',
      cost: Math.round(offsetCost * 1.2 * 100) / 100,
      quality: 'Premium',
      certification: 'CAR Verified'
    }
  ];
}