/**
 * Optimized Content Generator - Generates content in parallel chunks for speed
 */

import { callOpenAI } from '../openai';
import { logger } from '../utils/logger';

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
      "bestTimeToVisit": "Best months and weather"
    }`;

    try {
      const response = await callOpenAI(prompt, {
        temperature: 0.7,
        max_tokens: 300,
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
        bestTimeToVisit: 'Spring and fall offer pleasant weather'
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
   * Generate FAQs
   */
  private async generateFAQs(destination: string): Promise<any[]> {
    const prompt = `Create 3 FAQs for ${destination} travel. Return JSON array:
    [
      {"question": "Budget question", "answer": "Cost info"},
      {"question": "Duration question", "answer": "Days needed"},
      {"question": "Safety question", "answer": "Safety tips"}
    ]`;

    try {
      const response = await callOpenAI(prompt, {
        temperature: 0.6,
        max_tokens: 300,
        model: 'gpt-3.5-turbo',
        response_format: { type: "json_object" }
      });
      
      // Parse and ensure it's wrapped in an object if needed
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : (parsed.faqs || []);
    } catch (error) {
      logger.error('FAQs generation failed:', error);
      return [
        { question: `Is ${destination} expensive?`, answer: 'Costs vary by season and area' },
        { question: `How many days for ${destination}?`, answer: '3-4 days for main attractions' },
        { question: `Is ${destination} safe?`, answer: 'Generally safe with normal precautions' }
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
      const [meta, overview, attractions, practicalInfo, faqs] = await Promise.all([
        this.generateMeta(destination),
        this.generateOverview(destination),
        this.generateAttractions(destination),
        this.generatePracticalInfo(destination),
        this.generateFAQs(destination)
      ]);

      const content = {
        title: meta.title,
        metaDescription: meta.metaDescription,
        heroDescription: meta.heroDescription,
        overview: overview,
        bestTimeToVisit: meta.bestTimeToVisit,
        topAttractions: attractions,
        localTips: practicalInfo.localTips || [],
        gettingAround: practicalInfo.gettingAround,
        whereToStay: practicalInfo.whereToStay,
        foodAndDrink: practicalInfo.foodAndDrink,
        faqs: faqs
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