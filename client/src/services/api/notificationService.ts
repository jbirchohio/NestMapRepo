import apiClient from './apiClient'; // Default import
import { EventEmitter } from 'events';
export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'system';
    title: string;
    message: string;
    read: boolean;
    data?: Record<string, any>;
    createdAt: string;
    readAt?: string;
}
export interface NotificationCount {
    total: number;
    unread: number;
    byType: {
        info: number;
        success: number;
        warning: number;
        error: number;
        system: number;
    };
}
export interface NotificationPreferences {
    email: boolean;
    push: boolean;
    inApp: boolean;
    desktop: boolean;
    muteFor: number; // in minutes
}
class NotificationService extends EventEmitter {
    private static instance: NotificationService;
    private basePath = '/notifications';
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout = 1000; // Start with 1 second
    private ws: WebSocket | null = null;
    private isConnected = false;
    private eventCallbacks: Record<string, ((data: any) => void)[]> = {};
    private constructor() {
        super();
        this.setupWebSocket();
    }
    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }
    private setupWebSocket() {
        if (this.ws) {
            this.ws.close();
        }
        try {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/ws/notifications`;
            this.ws = new WebSocket(wsUrl);
            this.ws.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.emit('connected');
                console.log('WebSocket connected');
            };
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.emit('message', data);
                    // Emit specific event types
                    if (data.type) {
                        this.emit(data.type, data);
                    }
                }
                catch (error) {
                    console.error('Error processing WebSocket message:', error);
                }
            };
            this.ws.onclose = () => {
                this.isConnected = false;
                this.emit('disconnected');
                console.log('WebSocket disconnected');
                this.handleReconnect();
            };
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            };
        }
        catch (error) {
            console.error('Error setting up WebSocket:', error);
            this.handleReconnect();
        }
    }
    private handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const timeout = Math.min(this.reconnectTimeout * Math.pow(2, this.reconnectAttempts - 1), 30000 // Max 30 seconds
            );
            console.log(`Attempting to reconnect in ${timeout}ms...`);
            setTimeout(() => {
                this.setupWebSocket();
            }, timeout);
        }
        else {
            console.error('Max reconnection attempts reached');
            this.emit('reconnect_failed');
        }
    }
    public onEvent(event: string, callback: (data: any) => void) {
        if (!this.eventCallbacks[event]) {
            this.eventCallbacks[event] = [];
        }
        this.eventCallbacks[event].push(callback);
        // Return cleanup function
        return () => {
            if (this.eventCallbacks[event]) {
                this.eventCallbacks[event] = this.eventCallbacks[event].filter(cb => cb !== callback);
                // Clean up empty arrays
                if (this.eventCallbacks[event].length === 0) {
                    delete this.eventCallbacks[event];
                }
            }
        };
    }
    public sendMessage(type: string, data: any) {
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify({ type, data }));
        } else {
            console.warn('WebSocket not connected, message not sent:', { type, data });
        }
    }
    // REST API Methods
    public async getNotifications(params: {
        page?: number;
        limit?: number;
        read?: boolean;
        type?: string;
    } = {}): Promise<{
        data: Notification[];
        total: number;
    }> {
        return apiClient.get<{
            data: Notification[];
            total: number;
        }>(this.basePath, { params });
    }
    public async getUnreadCount(): Promise<NotificationCount> {
        return apiClient.get<NotificationCount>(`${this.basePath}/unread-count`);
    }
    public async markAsRead(notificationId: string): Promise<Notification> {
        return apiClient.patch<Notification>(`${this.basePath}/${notificationId}/read`, undefined);
    }
    public async markAllAsRead(): Promise<{
        count: number;
    }> {
        return apiClient.patch<{
            count: number;
        }>(`${this.basePath}/mark-all-read`, undefined);
    }
    public async getPreferences(): Promise<NotificationPreferences> {
        return apiClient.get<NotificationPreferences>(`${this.basePath}/preferences`);
    }
    public async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
        return apiClient.patch<NotificationPreferences>(
            `${this.basePath}/preferences`,
            preferences
        );
    }
    public async subscribeToTopic(topic: string): Promise<{
        success: boolean;
    }> {
        return apiClient.post<{
            success: boolean;
        }>(
            `${this.basePath}/subscribe`,
            { topic }
        );
    }
    public async unsubscribeFromTopic(topic: string): Promise<{
        success: boolean;
    }> {
        return apiClient.post<{
            success: boolean;
        }>(
            `${this.basePath}/unsubscribe`,
            { topic }
        );
    }
    // Cleanup
    public cleanup() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.removeAllListeners();
    }
}
export const notificationService = NotificationService.getInstance();
// Clean up on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        notificationService.cleanup();
    });
}
