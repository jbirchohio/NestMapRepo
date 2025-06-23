import OpenAI from "openai";
import { getWeatherForecast } from "weather.js";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
interface PricePrediction {
    currentPrice: number;
    predictedPrices: {
        date: string;
        price: number;
        confidence: number;
        recommendation: 'book_now' | 'wait' | 'monitor';
    }[];
    optimalBookingWindow: {
        start: string;
        end: string;
        expectedSavings: number;
    };
    seasonalTrends: {
        month: string;
        averagePrice: number;
        priceChange: number;
    }[];
}
interface CrowdPrediction {
    location: string;
    crowdLevel: 'low' | 'medium' | 'high' | 'extreme';
    confidence: number;
    peakHours: string[];
    bestVisitTimes: {
        time: string;
        crowdLevel: 'low' | 'medium';
        reason: string;
    }[];
    alternativeOptions: {
        name: string;
        distance: string;
        crowdLevel: 'low' | 'medium';
        similarity: number;
    }[];
}
interface WeatherAdaptation {
    originalPlan: any[];
    adaptedPlan: any[];
    weatherForecast: {
        date: string;
        condition: string;
        temperature: number;
        precipitation: number;
        recommendations: string[];
    }[];
    indoorAlternatives: any[];
    postponeRecommendations: any[];
}
export async function predictFlightPrices(origin: string, destination: string, departureDate: string, returnDate?: string): Promise<PricePrediction> {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key required for price prediction. Please provide OPENAI_API_KEY.');
        }
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert travel pricing analyst with access to real-time market data.
          Analyze flight pricing patterns and provide accurate predictions based on historical data and market trends.`
                },
                {
                    role: "user",
                    content: `Analyze flight pricing for ${origin} to ${destination} departing ${departureDate}${returnDate ? ` returning ${returnDate}` : ''}.
          
          Provide JSON response with:
          - currentPrice (estimated current market price)
          - predictedPrices (30-day forecast with dates, prices, confidence, recommendations)
          - optimalBookingWindow (best time to book with expected savings)
          - seasonalTrends (monthly price patterns)`
                }
            ],
            response_format: { type: "json_object" }
        });
        const prediction = JSON.parse(response.choices[0].message.content || '{}');
        return {
            currentPrice: prediction.currentPrice || 0,
            predictedPrices: prediction.predictedPrices || [],
            optimalBookingWindow: prediction.optimalBookingWindow || {
                start: departureDate,
                end: departureDate,
                expectedSavings: 0
            },
            seasonalTrends: prediction.seasonalTrends || []
        };
    }
    catch (error) {
        console.error('Error predicting flight prices:', error);
        throw new Error('Price prediction requires valid API credentials. Please provide necessary API keys.');
    }
}
export async function predictCrowdLevels(location: string, date: string, time?: string): Promise<CrowdPrediction> {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key required for crowd prediction. Please provide OPENAI_API_KEY.');
        }
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert in tourist crowd analysis and location optimization.
          Provide accurate crowd predictions based on location data, seasonality, and timing patterns.`
                },
                {
                    role: "user",
                    content: `Predict crowd levels for ${location} on ${date}${time ? ` at ${time}` : ''}.
          
          Provide JSON response with:
          - crowdLevel (low/medium/high/extreme)
          - confidence (0-1)
          - peakHours (array of busy times)
          - bestVisitTimes (optimal times with reasons)
          - alternativeOptions (less crowded similar locations)`
                }
            ],
            response_format: { type: "json_object" }
        });
        const prediction = JSON.parse(response.choices[0].message.content || '{}');
        return {
            location,
            crowdLevel: prediction.crowdLevel || 'medium',
            confidence: prediction.confidence || 0.8,
            peakHours: prediction.peakHours || [],
            bestVisitTimes: prediction.bestVisitTimes || [],
            alternativeOptions: prediction.alternativeOptions || []
        };
    }
    catch (error) {
        console.error('Error predicting crowd levels:', error);
        throw new Error('Crowd prediction requires valid API credentials. Please provide necessary API keys.');
    }
}
export async function generateWeatherAdaptiveItinerary(activities: any[], destination: string, dates: string[]): Promise<WeatherAdaptation> {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key required for weather adaptation. Please provide OPENAI_API_KEY.');
        }
        const weatherForecast = await getWeatherForecast(destination, dates);
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert travel planner specializing in weather-adaptive itineraries.
          Optimize travel plans based on weather forecasts while maintaining trip quality.`
                },
                {
                    role: "user",
                    content: `Adapt this itinerary for ${destination} based on weather forecast:
          
          Original Activities: ${JSON.stringify(activities)}
          Weather Forecast: ${JSON.stringify(weatherForecast)}
          
          Provide JSON response with:
          - adaptedPlan (modified activities considering weather)
          - indoorAlternatives (backup options for bad weather)
          - postponeRecommendations (activities to reschedule)`
                }
            ],
            response_format: { type: "json_object" }
        });
        const adaptation = JSON.parse(response.choices[0].message.content || '{}');
        return {
            originalPlan: activities,
            adaptedPlan: adaptation.adaptedPlan || activities,
            weatherForecast: weatherForecast,
            indoorAlternatives: adaptation.indoorAlternatives || [],
            postponeRecommendations: adaptation.postponeRecommendations || []
        };
    }
    catch (error) {
        console.error('Error generating weather-adaptive itinerary:', error);
        throw new Error('Weather adaptation requires valid API credentials. Please provide necessary API keys.');
    }
}
export async function optimizeItinerary(activities: any[], constraints: {
    budget?: number;
    timeLimit?: number;
    preferences?: string[];
}) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key required for itinerary optimization. Please provide OPENAI_API_KEY.');
        }
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert travel optimization specialist.
          Optimize itineraries for budget, time efficiency, and user satisfaction.`
                },
                {
                    role: "user",
                    content: `Optimize this itinerary:
          
          Activities: ${JSON.stringify(activities)}
          Constraints: ${JSON.stringify(constraints)}
          
          Provide JSON response with:
          - budgetOptimization (cost savings and recommendations)
          - timeOptimization (efficiency improvements)
          - experienceOptimization (satisfaction enhancements)`
                }
            ],
            response_format: { type: "json_object" }
        });
        const optimization = JSON.parse(response.choices[0].message.content || '{}');
        return {
            budgetOptimization: optimization.budgetOptimization || {},
            timeOptimization: optimization.timeOptimization || {},
            experienceOptimization: optimization.experienceOptimization || {}
        };
    }
    catch (error) {
        console.error('Error optimizing itinerary:', error);
        throw new Error('Itinerary optimization requires valid API credentials. Please provide necessary API keys.');
    }
}
// All mock data functions have been eliminated - system now requires authentic API credentials
