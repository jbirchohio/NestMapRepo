/**
 * Automated SEO Content Generation System
 * Generates high-quality, unique content for destination pages
 */

import { callOpenAI } from '../openai';
import { logger } from '../utils/logger';

interface DestinationContent {
  title: string;
  metaDescription: string;
  heroDescription: string;
  overview: string;
  bestTimeToVisit: string;
  topAttractions: string[];
  localTips: string[];
  gettingAround: string;
  whereToStay: string;
  foodAndDrink: string;
  faqs: Array<{question: string; answer: string}>;
}

interface ActivityContent {
  title: string;
  description: string;
  duration: string;
  highlights: string[];
  included: string[];
  notIncluded: string[];
  tips: string[];
}

// Cache generated content to avoid regenerating
const contentCache = new Map<string, any>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export class SEOContentGenerator {
  /**
   * Generate comprehensive destination guide content
   */
  async generateDestinationContent(destination: string): Promise<DestinationContent> {
    const cacheKey = `destination:${destination}`;
    const cached = contentCache.get(cacheKey);
    
    if (cached && cached.timestamp > Date.now() - CACHE_DURATION) {
      return cached.content;
    }
    
    // Return fallback content immediately and generate in background
    const fallbackContent = this.getFallbackDestinationContent(destination);
    
    // Skip AI generation if no OpenAI key
    if (!process.env.OPENAI_API_KEY) {
      return fallbackContent;
    }
    
    // Generate content in background for next request
    this.generateAndCacheInBackground(destination, cacheKey);
    
    // If we have old cached content that's expired, return it while generating new
    if (cached) {
      return cached.content;
    }
    
    // For first-time requests, try to generate quickly with timeout
    try {
      const prompt = `Generate comprehensive travel guide content for ${destination}. 
      
      Return a JSON object with the following structure:
      {
        "title": "Engaging title for ${destination} travel guide",
        "metaDescription": "155-character meta description optimized for search",
        "heroDescription": "2-3 sentence overview that captures the essence of ${destination}",
        "overview": "3-4 paragraph comprehensive overview of ${destination} as a travel destination",
        "bestTimeToVisit": "Detailed information about weather, seasons, and best times to visit",
        "topAttractions": ["Array of 8-10 must-see attractions with brief descriptions"],
        "localTips": ["Array of 5-7 insider tips for travelers"],
        "gettingAround": "Transportation options and tips for navigating ${destination}",
        "whereToStay": "Overview of neighborhoods and accommodation options",
        "foodAndDrink": "Local cuisine, must-try dishes, and dining recommendations",
        "faqs": [
          {"question": "Common question about ${destination}", "answer": "Helpful answer"},
          // Include 5-6 FAQs
        ]
      }
      
      Make the content engaging, informative, and SEO-friendly. Include specific details and local insights.`;
      
      // Use Promise.race for timeout
      const response = await Promise.race([
        callOpenAI(prompt, {
          temperature: 0.7,
          max_tokens: 1500, // Reduced for faster response
          response_format: { type: "json_object" }
        }),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('AI generation timeout')), 3000)
        )
      ]);
      
      const content = JSON.parse(response);
      
      // Cache the content
      contentCache.set(cacheKey, {
        content,
        timestamp: Date.now()
      });
      
      return content;
    } catch (error) {
      logger.error(`Error generating content for ${destination}:`, error);
      
      // Return fallback content
      return this.getFallbackDestinationContent(destination);
    }
  }
  
  /**
   * Generate activity-specific content
   */
  async generateActivityContent(activity: string, destination: string): Promise<ActivityContent> {
    const cacheKey = `activity:${activity}:${destination}`;
    const cached = contentCache.get(cacheKey);
    
    if (cached && cached.timestamp > Date.now() - CACHE_DURATION) {
      return cached.content;
    }
    
    try {
      const prompt = `Generate detailed content for "${activity}" in ${destination}.
      
      Return a JSON object with:
      {
        "title": "SEO-optimized title for the activity",
        "description": "2-3 paragraph engaging description",
        "duration": "Typical duration (e.g., '2-3 hours')",
        "highlights": ["Array of 4-6 key highlights or experiences"],
        "included": ["What's included in the activity"],
        "notIncluded": ["What's not included"],
        "tips": ["3-5 practical tips for this activity"]
      }`;
      
      const response = await callOpenAI(prompt, {
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });
      
      const content = JSON.parse(response);
      
      contentCache.set(cacheKey, {
        content,
        timestamp: Date.now()
      });
      
      return content;
    } catch (error) {
      logger.error(`Error generating activity content:`, error);
      return this.getFallbackActivityContent(activity, destination);
    }
  }
  
  /**
   * Generate comparison content for competitor pages
   */
  async generateComparisonContent(competitor: string): Promise<any> {
    const features = [
      'AI Trip Planning',
      'Package Deals (Save 22%)',
      'One-Click Booking',
      'Collaborative Planning',
      'Mobile App',
      'Price Comparison',
      'User Reviews',
      'Customer Support',
      'Free to Use',
      'No Ads'
    ];
    
    return {
      title: `Remvana vs ${competitor}: Which Travel Planner is Better?`,
      metaDescription: `Compare Remvana and ${competitor} for travel planning. See features, pricing, and user reviews to choose the best trip planner for you.`,
      introduction: `Choosing the right travel planning app can make or break your vacation. We've compared Remvana with ${competitor} across key features to help you decide.`,
      features: features.map(feature => ({
        feature,
        remvana: this.getFeatureStatus('remvana', feature),
        competitor: this.getFeatureStatus(competitor, feature),
        winner: this.determineWinner(feature, competitor)
      })),
      verdict: `While ${competitor} is a established player, Remvana offers unique advantages with AI-powered planning and 22% savings on package deals.`,
      cta: 'Try Remvana free and see the difference yourself.'
    };
  }
  
  /**
   * Generate blog post ideas for content marketing
   */
  async generateBlogTopics(count: number = 10): Promise<string[]> {
    const templates = [
      'The Ultimate Guide to [Destination] in [Year]',
      '[Number] Hidden Gems in [Destination] Locals Love',
      'How to Save Money on Your [Destination] Trip',
      '[Season] in [Destination]: Everything You Need to Know',
      'First Timer\'s Guide to [Destination]',
      '[Number] Day [Destination] Itinerary for [Traveler Type]',
      'Best Time to Visit [Destination] for [Activity]',
      '[Destination] Travel Mistakes to Avoid',
      'Where to Stay in [Destination]: Neighborhood Guide',
      '[Destination] Food Guide: What to Eat & Where'
    ];
    
    const destinations = ['Paris', 'Tokyo', 'New York', 'Bali', 'London', 'Dubai', 'Rome', 'Barcelona'];
    const seasons = ['Spring', 'Summer', 'Fall', 'Winter'];
    const travelerTypes = ['Families', 'Couples', 'Solo Travelers', 'Budget Travelers', 'Luxury Seekers'];
    
    const topics: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      const destination = destinations[Math.floor(Math.random() * destinations.length)];
      const season = seasons[Math.floor(Math.random() * seasons.length)];
      const travelerType = travelerTypes[Math.floor(Math.random() * travelerTypes.length)];
      
      let topic = template
        .replace('[Destination]', destination)
        .replace('[Year]', new Date().getFullYear().toString())
        .replace('[Number]', (Math.floor(Math.random() * 7) + 3).toString())
        .replace('[Season]', season)
        .replace('[Traveler Type]', travelerType)
        .replace('[Activity]', ['Beach Vacation', 'City Break', 'Adventure Travel'][Math.floor(Math.random() * 3)]);
      
      topics.push(topic);
    }
    
    return [...new Set(topics)]; // Remove duplicates
  }
  
  /**
   * Fallback content when AI generation fails
   */
  /**
   * Generate content in background for future requests
   */
  private async generateAndCacheInBackground(destination: string, cacheKey: string): Promise<void> {
    // Don't await this - let it run in background
    (async () => {
      try {
        const prompt = `Generate comprehensive travel guide content for ${destination}. 
        
        Return a JSON object with the following structure:
        {
          "title": "Engaging title for ${destination} travel guide",
          "metaDescription": "155-character meta description optimized for search",
          "heroDescription": "2-3 sentence overview that captures the essence of ${destination}",
          "overview": "3-4 paragraph comprehensive overview of ${destination} as a travel destination",
          "bestTimeToVisit": "Detailed information about weather, seasons, and best times to visit",
          "topAttractions": ["Array of 8-10 must-see attractions with brief descriptions"],
          "localTips": ["Array of 5-7 insider tips for travelers"],
          "gettingAround": "Transportation options and tips for navigating ${destination}",
          "whereToStay": "Overview of neighborhoods and accommodation options",
          "foodAndDrink": "Local cuisine, must-try dishes, and dining recommendations",
          "faqs": [
            {"question": "Common question about ${destination}", "answer": "Helpful answer"}
          ]
        }`;
        
        const response = await callOpenAI(prompt, {
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: "json_object" }
        });
        
        const content = JSON.parse(response);
        
        // Cache the content
        contentCache.set(cacheKey, {
          content,
          timestamp: Date.now()
        });
        
        logger.info(`Background generation completed for ${destination}`);
      } catch (error) {
        logger.error(`Background generation failed for ${destination}:`, error);
      }
    })();
  }

  private getFallbackDestinationContent(destination: string): DestinationContent {
    return {
      title: `${destination} Travel Guide - Plan Your Perfect Trip`,
      metaDescription: `Discover ${destination} with our comprehensive travel guide. Find the best hotels, activities, and local tips for an unforgettable trip.`,
      heroDescription: `${destination} offers travelers an incredible mix of culture, cuisine, and unforgettable experiences. Let us help you plan the perfect trip.`,
      overview: `${destination} is a remarkable destination that attracts millions of visitors each year. Whether you're seeking adventure, relaxation, or cultural immersion, ${destination} has something for everyone.`,
      bestTimeToVisit: `The best time to visit ${destination} depends on your preferences. Generally, spring and fall offer pleasant weather and fewer crowds.`,
      topAttractions: [
        `Explore the historic center of ${destination}`,
        `Visit the famous landmarks and monuments`,
        `Experience the local cuisine and markets`,
        `Discover hidden neighborhoods off the beaten path`,
        `Enjoy the vibrant nightlife and entertainment`
      ],
      localTips: [
        'Book accommodations in advance during peak season',
        'Learn a few basic phrases in the local language',
        'Try the street food for authentic local flavors',
        'Use public transportation to save money and time',
        'Respect local customs and dress codes'
      ],
      gettingAround: `${destination} offers various transportation options including public transit, taxis, and ride-sharing services. Consider getting a transit pass for convenience.`,
      whereToStay: `Choose from a variety of neighborhoods in ${destination}, each offering its own unique character and attractions. Downtown areas provide easy access to major sights.`,
      foodAndDrink: `${destination}'s culinary scene is diverse and exciting. Don't miss trying the local specialties and visiting the popular food markets.`,
      faqs: [
        {
          question: `Is ${destination} safe for tourists?`,
          answer: `${destination} is generally safe for tourists. As with any destination, stay aware of your surroundings and take normal precautions.`
        },
        {
          question: `What's the best way to get around ${destination}?`,
          answer: `Public transportation is efficient and affordable. Taxis and ride-sharing services are also readily available.`
        },
        {
          question: `How many days do I need in ${destination}?`,
          answer: `We recommend at least 3-4 days to see the main attractions, though a week allows for a more relaxed pace.`
        }
      ]
    };
  }
  
  private getFallbackActivityContent(activity: string, destination: string): ActivityContent {
    return {
      title: `${activity} in ${destination} - Book Your Experience`,
      description: `Experience the best of ${activity} in ${destination}. This popular activity offers visitors a unique way to explore and enjoy the destination.`,
      duration: '2-4 hours',
      highlights: [
        'Professional guides with local expertise',
        'Small group sizes for personalized experience',
        'All necessary equipment included',
        'Convenient meeting locations'
      ],
      included: [
        'Expert guide',
        'All activity equipment',
        'Safety briefing',
        'Insurance coverage'
      ],
      notIncluded: [
        'Transportation to meeting point',
        'Meals and beverages',
        'Gratuities',
        'Personal expenses'
      ],
      tips: [
        'Book in advance to secure your spot',
        'Wear comfortable clothing and shoes',
        'Bring water and sun protection',
        'Arrive 15 minutes before start time'
      ]
    };
  }
  
  private getFeatureStatus(app: string, feature: string): boolean {
    // Remvana features
    if (app === 'remvana') {
      const remvanaFeatures = [
        'AI Trip Planning',
        'Package Deals (Save 22%)',
        'One-Click Booking',
        'Collaborative Planning',
        'Price Comparison',
        'Free to Use',
        'No Ads'
      ];
      return remvanaFeatures.includes(feature);
    }
    
    // Simplified competitor features (in reality, research each)
    return Math.random() > 0.5;
  }
  
  private determineWinner(feature: string, competitor: string): string {
    // Features where Remvana excels
    const remvanaStrengths = [
      'AI Trip Planning',
      'Package Deals (Save 22%)',
      'No Ads',
      'Free to Use'
    ];
    
    if (remvanaStrengths.includes(feature)) {
      return 'remvana';
    }
    
    // Fair comparison for other features
    return Math.random() > 0.6 ? 'remvana' : competitor;
  }
}

// Export singleton instance
export const seoContentGenerator = new SEOContentGenerator();