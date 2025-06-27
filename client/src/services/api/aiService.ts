import { apiClient } from './apiClient';
export interface AISuggestion {
    id: string;
    text: string;
    type: 'activity' | 'location' | 'itinerary' | 'other';
    confidence?: number;
    metadata?: Record<string, any>;
}
export interface AILocationSuggestion extends AISuggestion {
    type: 'location';
    coordinates?: {
        latitude: number;
        longitude: number;
    };
    address?: string;
    placeId?: string;
}
export interface AIChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
    metadata?: Record<string, any>;
}
export interface AIChatResponse {
    message: string;
    suggestions?: AISuggestion[];
    metadata?: Record<string, any>;
    sessionId?: string;
}
class AIService {
    private static instance: AIService;
    private basePath = '/ai';
    private constructor() { }
    public static getInstance(): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService();
        }
        return AIService.instance;
    }
    public async chat(messages: AIChatMessage[], sessionId?: string, config?: RequestConfig): Promise<AIChatResponse> {
        return apiClient.post<AIChatResponse>(
            `${this.basePath}/chat`,
            { messages, sessionId },
            config
        );
    }
    public async findLocation(description: string, context?: {
        currentLocation?: {
            latitude: number;
            longitude: number;
        };
        tripId?: string;
    }, config?: RequestConfig): Promise<AILocationSuggestion> {
        return apiClient.post<AILocationSuggestion>(
            `${this.basePath}/find-location`,
            { description, ...context },
            config
        );
    }
    public async generateItinerary(tripDetails: {
        destination: string;
        startDate: string;
        endDate: string;
        interests?: string[];
        budget?: string;
        travelers?: number;
    }, config?: RequestConfig): Promise<{
        itinerary: string;
        suggestions: AISuggestion[];
    }> {
        return apiClient.post<{
            itinerary: string;
            suggestions: AISuggestion[];
        }>(
            `${this.basePath}/generate-itinerary`,
            tripDetails,
            config
        );
    }
    public async getActivitySuggestions(context: {
        location: string;
        date?: string;
        timeOfDay?: 'morning' | 'afternoon' | 'evening';
        interests?: string[];
        budget?: string;
    }, config?: RequestConfig): Promise<AISuggestion[]> {
        return apiClient.post<AISuggestion[]>(
            `${this.basePath}/suggest-activities`,
            context,
            config
        );
    }
    public async analyzeImage(image: File | Blob, context?: {
        tripId?: string;
        locationId?: string;
    }, config?: RequestConfig): Promise<{
        description: string;
        tags: string[];
        metadata: Record<string, any>;
    }> {
        const formData = new FormData();
        formData.append('image', image);
        if (context?.tripId)
            formData.append('tripId', context.tripId);
        if (context?.locationId)
            formData.append('locationId', context.locationId);
        return apiClient.post<{
            description: string;
            tags: string[];
            metadata: Record<string, any>;
        }>(`${this.basePath}/analyze-image`, formData, {
            ...config,
            headers: {
                ...config?.headers,
                'Content-Type': 'multipart/form-data',
            },
        });
    }
}
export const aiService = AIService.getInstance();
// Reuse the RequestConfig type from locationService
type RequestConfig = {
    headers?: Record<string, string>;
    params?: Record<string, any>;
    responseType?: 'json' | 'blob' | 'arraybuffer' | 'document' | 'text' | 'stream';
    [key: string]: unknown;
};
