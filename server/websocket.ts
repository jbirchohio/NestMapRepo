import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { parse } from 'url';
import jwt from 'jsonwebtoken';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  organizationId?: number;
  tripId?: number;
}

interface WebSocketMessage {
  type: 'join_trip' | 'leave_trip' | 'trip_update' | 'comment_added' | 'activity_changed' | 'user_presence';
  tripId?: number;
  data?: any;
}

export class CollaborationWebSocketServer {
  private wss: WebSocketServer;
  private tripRooms: Map<number, Set<AuthenticatedWebSocket>> = new Map();
  private userPresence: Map<number, { userId: number; lastSeen: Date }> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/collaboration'
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Clean up inactive connections every 30 seconds
    setInterval(() => this.cleanupInactiveConnections(), 30000);
  }

  private async handleConnection(ws: AuthenticatedWebSocket, request: any) {
    try {
      const url = parse(request.url, true);
      const token = url.query.token as string;

      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'dev-secret') as any;
      ws.user_id = decoded.user_id;
      ws.organization_id = decoded.organization_id;

      console.log(`WebSocket connected: User ${ws.user_id} from org ${ws.organization_id}`);

      ws.on('message', (data) => this.handleMessage(ws, data));
      ws.on('close', () => this.handleDisconnect(ws));
      ws.on('error', (error) => console.error('WebSocket error:', error));

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        userId: ws.user_id,
        organizationId: ws.organization_id
      }));

    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      ws.close(1008, 'Invalid token');
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, data: Buffer) {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'join_trip':
          this.handleJoinTrip(ws, message.trip_id!);
          break;
        case 'leave_trip':
          this.handleLeaveTrip(ws, message.trip_id!);
          break;
        case 'trip_update':
          this.broadcastToTrip(message.trip_id!, {
            type: 'trip_updated',
            userId: ws.user_id,
            data: message.data
          }, ws);
          break;
        case 'comment_added':
          this.broadcastToTrip(message.trip_id!, {
            type: 'comment_added',
            userId: ws.user_id,
            data: message.data
          }, ws);
          break;
        case 'activity_changed':
          this.broadcastToTrip(message.trip_id!, {
            type: 'activity_changed',
            userId: ws.user_id,
            data: message.data
          }, ws);
          break;
        case 'user_presence':
          this.updateUserPresence(ws, message.trip_id!);
          break;
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  private handleJoinTrip(ws: AuthenticatedWebSocket, tripId: number) {
    if (!this.tripRooms.has(tripId)) {
      this.tripRooms.set(tripId, new Set());
    }
    
    this.tripRooms.get(tripId)!.add(ws);
    ws.trip_id = tripId;
    
    // Update user presence
    this.userPresence.set(ws.user_id!, {
      userId: ws.user_id!,
      lastSeen: new Date()
    });

    // Notify other users in the trip
    this.broadcastToTrip(tripId, {
      type: 'user_joined',
      userId: ws.user_id,
      organizationId: ws.organization_id
    }, ws);

    console.log(`User ${ws.user_id} joined trip ${tripId}`);
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
      userId: ws.user_id
    }, ws);

    ws.trip_id = undefined;
    console.log(`User ${ws.user_id} left trip ${tripId}`);
  }

  private handleDisconnect(ws: AuthenticatedWebSocket) {
    if (ws.trip_id) {
      this.handleLeaveTrip(ws, ws.trip_id);
    }
    
    if (ws.user_id) {
      this.userPresence.delete(ws.user_id);
    }
    
    console.log(`User ${ws.user_id} disconnected`);
  }

  private updateUserPresence(ws: AuthenticatedWebSocket, tripId: number) {
    this.userPresence.set(ws.user_id!, {
      userId: ws.user_id!,
      lastSeen: new Date()
    });

    // Broadcast presence update to trip members
    this.broadcastToTrip(tripId, {
      type: 'presence_update',
      userId: ws.user_id,
      lastSeen: new Date()
    });
  }

  private broadcastToTrip(tripId: number, message: any, sender?: AuthenticatedWebSocket) {
    const room = this.tripRooms.get(tripId);
    if (!room) return;

    const messageString = JSON.stringify(message);
    
    room.forEach(client => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        // Verify client still belongs to same organization
        if (sender?.organization_id && client.organization_id !== sender.organization_id) {
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
      } else {
        this.tripRooms.set(tripId, activeClients);
      }
    });
  }

  // Public method to broadcast trip updates from API endpoints
  public notifyTripUpdate(tripId: number, organizationId: number, updateType: string, data: any) {
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
    if (!room) return [];
    
    return Array.from(room)
      .filter(client => client.readyState === WebSocket.OPEN)
      .map(client => client.user_id!)
      .filter(userId => userId !== undefined);
  }
}

export let collaborationWS: CollaborationWebSocketServer;