/**
 * Optimized Content Generator - Generates content in parallel chunks for speed
 */

import { callOpenAI } from '../openai';
import { logger } from '../utils/logger';
import { unsplashService } from './unsplashService';

interface DestinationSection {
  overview?: string;
  attractions?: string[];
  tips?: string[];
  food?: string;
  transport?: string;
  neighborhoods?: string;
}

export class OptimizedContentGenerator {
  /**
   * Generate basic meta information quickly
   */
  private async generateMeta(destination: string): Promise<any> {
    const prompt = `For ${destination}, provide a JSON object with:
    {
      "title": "Engaging travel guide title",
      "metaDescription": "155-char SEO description",
      "heroDescription": "2 sentences about what makes it special",
      "bestTimeToVisit": "Best months and weather",
      "country": "Country name (e.g., 'USA', 'France', 'Japan')",
      "estimatedActivities": "Approximate number of tourist activities available (number only, e.g., 250)",
      "seasonalWeather": {
        "description": "Typical weather pattern (e.g., 'Mediterranean climate with hot summers')",
        "avgHighTemp": "Average high temperature in peak season (number only)",
        "avgLowTemp": "Average low temperature in off season (number only)",
        "rainyMonths": "Main rainy season if applicable"
      }
    }`;

    try {
      const response = await callOpenAI(prompt, {
        temperature: 0.7,
        max_tokens: 400,
        model: 'gpt-3.5-turbo', // Faster model for simple content
        response_format: { type: "json_object" }
      });
      return JSON.parse(response);
    } catch (error) {
      logger.error('Meta generation failed:', error);
      return {
        title: `${destination} Travel Guide`,
        metaDescription: `Discover ${destination} with our comprehensive guide`,
        heroDescription: `${destination} offers unique experiences for every traveler.`,
        bestTimeToVisit: 'Spring and fall offer pleasant weather',
        country: 'World',
        estimatedActivities: 100,
        seasonalWeather: {
          description: 'Temperate climate with four distinct seasons',
          avgHighTemp: 75,
          avgLowTemp: 45,
          rainyMonths: 'Spring months see occasional rain'
        }
      };
    }
  }

  /**
   * Generate attractions list
   */
  private async generateAttractions(destination: string): Promise<string[]> {
    const prompt = `List 6 famous attractions in ${destination}. Return a JSON array of strings, each being a specific landmark or place name. Example: ["Eiffel Tower", "Louvre Museum"]`;

    try {
      const response = await callOpenAI(prompt, {
        temperature: 0.5,
        max_tokens: 200,
        model: 'gpt-3.5-turbo'
      });
      return JSON.parse(response);
    } catch (error) {
      logger.error('Attractions generation failed:', error);
      return [`Historic center of ${destination}`, 'Famous landmarks', 'Local markets'];
    }
  }

  /**
   * Generate overview content
   */
  private async generateOverview(destination: string): Promise<string> {
    const prompt = `Write 2 paragraphs about ${destination} covering its character, culture, and what makes it unique. Be specific and engaging.`;

    try {
      const response = await callOpenAI(prompt, {
        temperature: 0.7,
        max_tokens: 400,
        model: 'gpt-3.5-turbo'
      });
      return response;
    } catch (error) {
      logger.error('Overview generation failed:', error);
      return `${destination} is a vibrant destination with rich culture and history.`;
    }
  }

  /**
   * Generate practical information
   */
  private async generatePracticalInfo(destination: string): Promise<any> {
    const prompt = `For ${destination}, provide practical travel info as JSON:
    {
      "gettingAround": "Main transport options (1-2 sentences)",
      "whereToStay": "Best neighborhoods (1-2 sentences)",
      "foodAndDrink": "Must-try dishes and dining (1-2 sentences)",
      "localTips": ["3 practical tips"]
    }`;

    try {
      const response = await callOpenAI(prompt, {
        temperature: 0.6,
        max_tokens: 400,
        model: 'gpt-3.5-turbo',
        response_format: { type: "json_object" }
      });
      return JSON.parse(response);
    } catch (error) {
      logger.error('Practical info generation failed:', error);
      return {
        gettingAround: 'Public transport and taxis are readily available',
        whereToStay: 'Downtown offers convenient access to attractions',
        foodAndDrink: 'Try local specialties at markets and restaurants',
        localTips: ['Book ahead in peak season', 'Learn basic local phrases', 'Use public transport']
      };
    }
  }

  /**
   * Generate image URLs using Unsplash API
   */
  private async generateImageUrls(destination: string): Promise<any> {
    try {
      // Use Unsplash API to search for destination photos
      const imageResult = await unsplashService.searchDestinationPhotos(destination);
      
      return {
        coverImage: imageResult.coverImage,
        thumbnailImage: imageResult.thumbnailImage,
        contentImage: imageResult.contentImage,
        imageAttribution: {
          photographerName: imageResult.photographer.name,
          photographerUsername: imageResult.photographer.username,
          photographerUrl: imageResult.photographer.profileUrl,
          photoUrl: imageResult.photoUrl
        }
      };
    } catch (error) {
      logger.error('Image generation failed:', error);
      // Return gradient fallback
      return {
        coverImage: null,
        thumbnailImage: null,
        contentImage: null,
        imageAttribution: null
      };
    }
  }

  /**
   * Generate FAQs
   */
  private async generateFAQs(destination: string): Promise<any[]> {
    const prompt = `Create 5 detailed FAQs for travelers visiting ${destination}. Return a JSON object with an array:
    {
      "faqs": [
        {
          "question": "What is the best time of year to visit ${destination}?",
          "answer": "Provide specific months and explain weather patterns, tourist seasons, and any special events"
        },
        {
          "question": "How much should I budget for a trip to ${destination}?",
          "answer": "Give specific daily budget ranges for budget/mid-range/luxury travelers, including accommodation, food, and activities"
        },
        {
          "question": "How many days do I need to explore ${destination}?",
          "answer": "Suggest ideal trip duration with reasoning, what can be seen in that time"
        },
        {
          "question": "Is ${destination} safe for tourists?",
          "answer": "Provide honest safety assessment with specific tips for staying safe"
        },
        {
          "question": "What are the must-try local foods in ${destination}?",
          "answer": "List 3-4 specific dishes or foods unique to this destination with brief descriptions"
        }
      ]
    }
    
    Provide detailed, helpful answers that are specific to ${destination}. Each answer should be 2-3 sentences long.`;

    try {
      const response = await callOpenAI(prompt, {
        temperature: 0.7,
        max_tokens: 800,
        model: 'gpt-3.5-turbo',
        response_format: { type: "json_object" }
      });
      
      const parsed = JSON.parse(response);
      return parsed.faqs || [];
    } catch (error) {
      logger.error('FAQs generation failed:', error);
      // Return detailed fallback FAQs
      return [
        { 
          question: `What is the best time of year to visit ${destination}?`,
          answer: `Spring (March-May) and fall (September-November) typically offer the most pleasant weather in ${destination}, with mild temperatures and fewer crowds. Summer can be peak tourist season with higher prices, while winter may offer unique seasonal activities.`
        },
        { 
          question: `How much should I budget for a trip to ${destination}?`,
          answer: `Budget travelers can expect to spend $50-80 per day in ${destination}, mid-range travelers $100-200 per day, and luxury travelers $250+ per day. This includes accommodation, meals, local transportation, and some activities.`
        },
        { 
          question: `How many days do I need to explore ${destination}?`,
          answer: `A minimum of 3-4 days is recommended to see the main highlights of ${destination}. For a more relaxed pace and to explore beyond the tourist areas, 5-7 days would be ideal.`
        },
        {
          question: `Is ${destination} safe for tourists?`,
          answer: `${destination} is generally safe for tourists who take normal precautions. Stay aware of your surroundings, keep valuables secure, use official taxis or ride-sharing apps, and avoid walking alone in unfamiliar areas at night.`
        },
        {
          question: `What are the must-try local foods in ${destination}?`,
          answer: `${destination} offers a rich culinary experience with local specialties worth trying. Visit local markets and restaurants to sample authentic dishes, and don't miss trying the street food if it's popular in the area.`
        }
      ];
    }
  }

  /**
   * Main method - generates all content in parallel
   */
  async generateDestinationContent(destination: string): Promise<any> {
    const startTime = Date.now();
    logger.info(`Starting optimized generation for ${destination}`);

    try {
      // Run all generations in parallel for speed
      const [meta, overview, attractions, practicalInfo, faqs, images] = await Promise.all([
        this.generateMeta(destination),
        this.generateOverview(destination),
        this.generateAttractions(destination),
        this.generatePracticalInfo(destination),
        this.generateFAQs(destination),
        this.generateImageUrls(destination)
      ]);

      const content = {
        title: meta.title,
        metaDescription: meta.metaDescription,
        heroDescription: meta.heroDescription,
        overview: overview,
        bestTimeToVisit: meta.bestTimeToVisit,
        country: meta.country,
        estimatedActivities: meta.estimatedActivities || 100,
        seasonalWeather: meta.seasonalWeather,
        topAttractions: attractions,
        localTips: practicalInfo.localTips || [],
        gettingAround: practicalInfo.gettingAround,
        whereToStay: practicalInfo.whereToStay,
        foodAndDrink: practicalInfo.foodAndDrink,
        faqs: faqs,
        coverImage: images.coverImage,
        thumbnailImage: images.thumbnailImage,
        contentImage: images.contentImage,
        imageAttribution: images.imageAttribution
      };

      const duration = Date.now() - startTime;
      logger.info(`Optimized generation completed for ${destination} in ${duration}ms`);

      return content;
    } catch (error) {
      logger.error(`Optimized generation failed for ${destination}:`, error);
      
      // Return basic fallback content
      return {
        title: `${destination} Travel Guide`,
        metaDescription: `Explore ${destination} with our travel guide`,
        heroDescription: `Discover the best of ${destination}`,
        overview: `${destination} offers unique experiences for travelers.`,
        bestTimeToVisit: 'Check seasonal weather patterns',
        topAttractions: [`Explore ${destination}`, 'Visit landmarks', 'Experience culture'],
        localTips: ['Plan ahead', 'Learn local customs', 'Try local food'],
        gettingAround: 'Various transport options available',
        whereToStay: 'Multiple neighborhoods to choose from',
        foodAndDrink: 'Diverse dining options',
        faqs: [
          { question: 'When to visit?', answer: 'Depends on preferences' },
          { question: 'How long to stay?', answer: '3-5 days recommended' },
          { question: 'Is it safe?', answer: 'Generally safe for tourists' }
        ]
      };
    }
  }
}

export const optimizedContentGenerator = new OptimizedContentGenerator();