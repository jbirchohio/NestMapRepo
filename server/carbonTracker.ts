import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface CarbonFootprint {
  totalEmissions: number; // kg CO2
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

interface CarbonReduction {
  category: string;
  action: string;
  potentialSaving: number; // kg CO2
  implementation: 'easy' | 'moderate' | 'difficult';
  costImpact: 'none' | 'low' | 'medium' | 'high';
}

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
      breakdown: result.breakdown || generateEmissionsBreakdown(activities, flights, accommodation),
      comparison: result.comparison || generateEmissionsComparison(result.totalEmissions || 0),
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
    meals: Math.round(total * 0.02)
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
    breakdown: generateEmissionsBreakdown(activities, flights, accommodation),
    comparison: generateEmissionsComparison(totalEmissions),
    recommendations: generateCarbonRecommendations()
  };
}

function calculateTotalExpenses(expenses: any[]): number {
  return expenses.reduce((total, expense) => total + (expense.amount || 0), 0);
}

function generateExpenseBreakdown(expenses: any[]): any {
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
  const totalBudget = budget || Object.values(breakdown).reduce((sum, val) => sum + val, 0) * 1.2;
  
  return Object.entries(breakdown).map(([name, actual]) => {
    const budgeted = totalBudget / Object.keys(breakdown).length;
    const variance = actual - budgeted;
    
    return {
      name,
      budgeted: Math.round(budgeted),
      actual: Math.round(actual),
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