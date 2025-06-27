import { WebSocketServer, WebSocket } from 'ws';
import { type RawData } from 'ws';
import type { Server } from 'http';
import { parse } from 'url';
import jwt from 'jsonwebtoken';
export interface AuthenticatedWebSocket extends WebSocket {
    userId?: number;
    organizationId?: number;
    tripId?: number;
}

/** Base interface for all WebSocket messages */
interface BaseWebSocketMessage {
    type: string;
    tripId?: number;
}

/** Specific message types */
interface JoinTripMessage extends BaseWebSocketMessage {
    type: 'join_trip';
    tripId: number;
}

interface LeaveTripMessage extends BaseWebSocketMessage {
    type: 'leave_trip';
    tripId: number;
}

interface TripUpdateMessage extends BaseWebSocketMessage {
    type: 'trip_update';
    tripId: number;
    data: unknown;
}

interface CommentAddedMessage extends BaseWebSocketMessage {
    type: 'comment_added';
    tripId: number;
    data: unknown;
}

interface ActivityChangedMessage extends BaseWebSocketMessage {
    type: 'activity_changed';
    tripId: number;
    data: unknown;
}

interface UserPresenceMessage extends BaseWebSocketMessage {
    type: 'user_presence';
    tripId: number;
}

/** Union type of all possible WebSocket messages */
type WebSocketMessage = 
    | JoinTripMessage
    | LeaveTripMessage
    | TripUpdateMessage
    | CommentAddedMessage
    | ActivityChangedMessage
    | UserPresenceMessage;

/** Type for outgoing messages */
interface OutgoingMessage<T = unknown> {
    type: string;
    userId?: number;
    organizationId?: number;
    data?: T;
    lastSeen?: Date;
}
export class CollaborationWebSocketServer {
    private wss: WebSocketServer;
    private tripRooms: Map<number, Set<AuthenticatedWebSocket>> = new Map();
    private userPresence: Map<number, {
        userId: number;
        lastSeen: Date;
    }> = new Map();
    constructor(server: Server) {
        this.wss = new WebSocketServer({
            server,
            path: '/ws/collaboration'
        });
        this.wss.on('connection', this.handleConnection.bind(this));
        // Clean up inactive connections every 30 seconds
        setInterval(() => this.cleanupInactiveConnections(), 30000);
    }
    private async handleConnection(ws: AuthenticatedWebSocket, request: { url?: string }) {
        try {
            const url = parse(request.url, true);
            const token = url.query.token as string;
            if (!token) {
                ws.close(1008, 'Authentication required');
                return;
            }
            // Verify JWT token
            const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'dev-secret') as any;
            ws.userId = decoded.user_id;
            ws.organizationId = decoded.organization_id;
            console.log(`WebSocket connected: User ${ws.userId} from org ${ws.organizationId}`);
            ws.on('message', (data) => this.handleMessage(ws, data));
            ws.on('close', () => this.handleDisconnect(ws));
            ws.on('error', (error) => console.error('WebSocket error:', error));
            // Send welcome message
            ws.send(JSON.stringify({
                type: 'connected',
                userId: ws.userId,
                organizationId: ws.organizationId
            }));
        }
        catch (error) {
            console.error('WebSocket authentication failed:', error);
            ws.close(1008, 'Invalid token');
        }
    }
    private handleMessage(ws: AuthenticatedWebSocket, data: RawData) {
        try {
            const message: WebSocketMessage = JSON.parse(data.toString());
            switch (message.type) {
                case 'join_trip':
                    this.handleJoinTrip(ws, message.tripId!);
                    break;
                case 'leave_trip':
                    this.handleLeaveTrip(ws, message.tripId!);
                    break;
                case 'trip_update':
                    this.broadcastToTrip(message.tripId!, {
                        type: 'trip_updated',
                        userId: ws.userId,
                        data: message.data
                    }, ws);
                    break;
                case 'comment_added':
                    this.broadcastToTrip(message.tripId!, {
                        type: 'comment_added',
                        userId: ws.userId,
                        data: message.data
                    }, ws);
                    break;
                case 'activity_changed':
                    this.broadcastToTrip(message.tripId!, {
                        type: 'activity_changed',
                        userId: ws.userId,
                        data: message.data
                    }, ws);
                    break;
                case 'user_presence':
                    this.updateUserPresence(ws, message.tripId!);
                    break;
            }
        }
        catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }
    private handleJoinTrip(ws: AuthenticatedWebSocket, tripId: number) {
        if (!this.tripRooms.has(tripId)) {
            this.tripRooms.set(tripId, new Set());
        }
        this.tripRooms.get(tripId)!.add(ws);
        ws.tripId = tripId;
        // Update user presence
        this.userPresence.set(ws.userId!, {
            userId: ws.userId!,
            lastSeen: new Date()
        });
        // Notify other users in the trip
        this.broadcastToTrip(tripId, {
            type: 'user_joined',
            userId: ws.userId,
            organizationId: ws.organizationId
        }, ws);
        console.log(`User ${ws.userId} joined trip ${tripId}`);
    }
    private handleLeaveTrip(ws: AuthenticatedWebSocket, tripId: number) {
        const room = this.tripRooms.get(tripId);
        if (room) {
            room.delete(ws);
            if (room.size === 0) {
                this.tripRooms.delete(tripId);
            }
        }
        // Notify other users
        this.broadcastToTrip(tripId, {
            type: 'user_left',
            userId: ws.userId
        }, ws);
        ws.tripId = undefined;
        console.log(`User ${ws.userId} left trip ${tripId}`);
    }
    private handleDisconnect(ws: AuthenticatedWebSocket) {
        if (ws.tripId) {
            this.handleLeaveTrip(ws, ws.tripId);
        }
        if (ws.userId) {
            this.userPresence.delete(ws.userId);
        }
        console.log(`User ${ws.userId} disconnected`);
    }
    private updateUserPresence(ws: AuthenticatedWebSocket, tripId: number) {
        this.userPresence.set(ws.userId!, {
            userId: ws.userId!,
            lastSeen: new Date()
        });
        // Broadcast presence update to trip members
        this.broadcastToTrip(tripId, {
            type: 'presence_update',
            userId: ws.userId,
            lastSeen: new Date()
        });
    }
    private broadcastToTrip<T = unknown>(tripId: number, message: OutgoingMessage<T>, sender?: AuthenticatedWebSocket) {
        const room = this.tripRooms.get(tripId);
        if (!room)
            return;
        const messageString = JSON.stringify(message);
        room.forEach(client => {
            if (client !== sender && client.readyState === WebSocket.OPEN) {
                // Verify client still belongs to same organization
                if (sender?.organizationId && client.organizationId !== sender.organizationId) {
                    return; // Skip cross-organization broadcasts
                }
                client.send(messageString);
            }
        });
    }
    private cleanupInactiveConnections() {
        const now = new Date();
        const timeout = 5 * 60 * 1000; // 5 minutes
        this.userPresence.forEach((presence, userId) => {
            if (now.getTime() - presence.lastSeen.getTime() > timeout) {
                this.userPresence.delete(userId);
            }
        });
        // Remove closed connections from rooms
        this.tripRooms.forEach((room, tripId) => {
            const activeClients = new Set<AuthenticatedWebSocket>();
            room.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    activeClients.add(client);
                }
            });
            if (activeClients.size === 0) {
                this.tripRooms.delete(tripId);
            }
            else {
                this.tripRooms.set(tripId, activeClients);
            }
        });
    }
    // Public method to broadcast trip updates from API endpoints
    /**
     * Notify all clients in a trip about an update
     * @param tripId - The ID of the trip
     * @param organizationId - The ID of the organization
     * @param updateType - The type of update
     * @param data - The update data
     */
    public notifyTripUpdate<T = unknown>(
        tripId: number, 
        organizationId: number, 
        updateType: string, 
        data: T
    ): void {
        this.broadcastToTrip(tripId, {
            type: updateType,
            organizationId,
            data,
            timestamp: new Date()
        });
    }
    // Get active users for a trip
    public getActiveTripUsers(tripId: number): number[] {
        const room = this.tripRooms.get(tripId);
        if (!room)
            return [];
        return Array.from(room)
            .filter(client => client.readyState === WebSocket.OPEN)
            .map(client => client.userId!)
            .filter(userId => userId !== undefined);
    }
}
export let collaborationWS: CollaborationWebSocketServer;
