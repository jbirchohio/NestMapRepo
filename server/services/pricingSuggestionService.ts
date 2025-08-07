import { logger } from '../utils/logger';

interface PricingFactors {
  duration: number; // days
  activityCount: number;
  hasFlights?: boolean;
  hasHotels?: boolean;
  hasMeals?: boolean;
  hasTransportation?: boolean;
  destinations: string[];
  tags: string[];
  creatorScore?: number;
  similarTemplatesPrices?: number[];
}

export class PricingSuggestionService {
  /**
   * Calculate suggested price based on template characteristics
   */
  calculateSuggestedPrice(factors: PricingFactors): {
    suggested: number;
    minimum: number;
    maximum: number;
    reasoning: string[];
    priceRange: 'budget' | 'standard' | 'premium' | 'luxury';
  } {
    let basePrice = 0;
    const reasoning: string[] = [];

    // Base price per day of content ($2-5 per day)
    const pricePerDay = factors.duration <= 3 ? 5 : factors.duration <= 7 ? 4 : 3;
    basePrice = factors.duration * pricePerDay;
    reasoning.push(`$${pricePerDay}/day for ${factors.duration} days = $${factors.duration * pricePerDay}`);

    // Activity density bonus ($0.50 per activity)
    const activityBonus = Math.min(factors.activityCount * 0.5, 25); // Cap at $25
    if (activityBonus > 0) {
      basePrice += activityBonus;
      reasoning.push(`+$${activityBonus.toFixed(2)} for ${factors.activityCount} activities`);
    }

    // Comprehensive trip bonus (includes flights, hotels, etc.)
    let comprehensiveBonus = 0;
    if (factors.hasFlights) comprehensiveBonus += 10;
    if (factors.hasHotels) comprehensiveBonus += 5;
    if (factors.hasMeals) comprehensiveBonus += 5;
    if (factors.hasTransportation) comprehensiveBonus += 5;
    
    if (comprehensiveBonus > 0) {
      basePrice += comprehensiveBonus;
      reasoning.push(`+$${comprehensiveBonus} for comprehensive planning`);
    }

    // Multi-destination bonus
    if (factors.destinations.length > 1) {
      const multiDestBonus = (factors.destinations.length - 1) * 5;
      basePrice += multiDestBonus;
      reasoning.push(`+$${multiDestBonus} for ${factors.destinations.length} destinations`);
    }

    // Premium tags bonus
    const premiumTags = ['luxury', 'honeymoon', 'business', 'exclusive', 'vip'];
    const hasPremiumTag = factors.tags.some(tag => 
      premiumTags.includes(tag.toLowerCase())
    );
    if (hasPremiumTag) {
      basePrice *= 1.5; // 50% premium
      reasoning.push(`×1.5 for premium experience`);
    }

    // Creator reputation multiplier
    if (factors.creatorScore && factors.creatorScore > 80) {
      basePrice *= 1.2; // 20% premium for top creators
      reasoning.push(`×1.2 for verified creator status`);
    }

    // Market adjustment based on similar templates
    if (factors.similarTemplatesPrices && factors.similarTemplatesPrices.length > 0) {
      const marketAvg = factors.similarTemplatesPrices.reduce((a, b) => a + b, 0) / 
                       factors.similarTemplatesPrices.length;
      
      // Adjust toward market average (weighted 30%)
      const marketAdjustedPrice = (basePrice * 0.7) + (marketAvg * 0.3);
      
      if (Math.abs(marketAdjustedPrice - basePrice) > 5) {
        reasoning.push(`Adjusted ${marketAdjustedPrice > basePrice ? 'up' : 'down'} based on market`);
        basePrice = marketAdjustedPrice;
      }
    }

    // Round to nearest .99
    const suggested = Math.round(basePrice) - 0.01;

    // Calculate min/max range (±40% of suggested)
    const minimum = Math.max(4.99, Math.round(suggested * 0.6) - 0.01);
    const maximum = Math.round(suggested * 1.4) - 0.01;

    // Determine price range category
    let priceRange: 'budget' | 'standard' | 'premium' | 'luxury';
    if (suggested < 15) priceRange = 'budget';
    else if (suggested < 40) priceRange = 'standard';
    else if (suggested < 80) priceRange = 'premium';
    else priceRange = 'luxury';

    return {
      suggested: Math.max(4.99, suggested), // Never go below $4.99
      minimum,
      maximum: Math.min(299.99, maximum), // Cap at $299.99
      reasoning,
      priceRange
    };
  }

  /**
   * Get similar templates for price comparison
   */
  async getSimilarTemplatesPrices(
    duration: number,
    destinations: string[],
    storage: any
  ): Promise<number[]> {
    try {
      // Get templates with similar duration (±2 days)
      const similarTemplates = await storage.db
        .select()
        .from(storage.templates)
        .where(
          storage.and(
            storage.eq(storage.templates.status, 'published'),
            storage.gte(storage.templates.duration, duration - 2),
            storage.lte(storage.templates.duration, duration + 2)
          )
        )
        .limit(10);

      return similarTemplates
        .map((t: any) => parseFloat(t.price || '0'))
        .filter((p: number) => p > 0);
    } catch (error) {
      logger.error('Error fetching similar templates:', error);
      return [];
    }
  }

  /**
   * Validate price against marketplace rules
   */
  validatePrice(price: number): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (price < 0) {
      errors.push('Price cannot be negative');
    }

    if (price < 4.99 && price !== 0) {
      errors.push('Minimum price is $4.99 (or free at $0)');
    }

    if (price > 299.99) {
      errors.push('Maximum price is $299.99');
    }

    // Check for reasonable decimal places
    const decimalPlaces = (price.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      errors.push('Price can have maximum 2 decimal places');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const pricingSuggestionService = new PricingSuggestionService();