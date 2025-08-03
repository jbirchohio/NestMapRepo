import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

interface CollaboratorPresence {
  userId: number;
  username: string;
  avatar?: string;
  currentPage: string;
  currentSection?: string;
  cursor?: { x: number; y: number };
  lastSeen: Date;
  isActive: boolean;
  color: string;
}

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

interface CollaboratorData {
  userId: number;
  username: string;
  avatar?: string;
  currentPage: string;
  currentSection?: string;
  cursor?: { x: number; y: number };
  lastSeen: string | Date;
  isActive: boolean;
}

interface ActivityData {
  [key: string]: unknown;
}

interface UseRealTimeCollaborationProps {
  tripId?: number;
  organizationId?: number;
  userId?: number;
}

const PRESENCE_COLORS = [
  '#2563eb', '#dc2626', '#059669', '#7c3aed', '#ea580c',
  '#0891b2', '#c2410c', '#be123c', '#4338ca', '#0d9488'
];

export function useRealTimeCollaboration({ 
  tripId, 
  organizationId, 
  userId 
}: UseRealTimeCollaborationProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [location] = useLocation();
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const cursorTimeoutRef = useRef<NodeJS.Timeout>();

  // Establish WebSocket connection
  useEffect(() => {
    if (!tripId || !userId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/collaboration`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        
        // Join trip collaboration room
        ws.send(JSON.stringify({
          type: 'join_trip',
          tripId,
          userId,
          organizationId,
          userInfo: {
            username: 'Current User', // This would come from auth context
            currentPage: location
          }
        }));

        // Start heartbeat
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
        }
      };

      ws.onerror = (error) => {
        setConnectionError('Connection failed');
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      setConnectionError('Failed to connect');
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, [tripId, userId, organizationId]);

  // Update presence when location changes
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'presence_update',
        currentPage: location,
        timestamp: new Date().toISOString()
      }));
    }
  }, [location]);

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case 'collaborators_list':
        setCollaborators((data.collaborators as CollaboratorData[]).map((collab: CollaboratorData, index: number) => ({
          ...collab,
          lastSeen: new Date(collab.lastSeen),
          color: PRESENCE_COLORS[index % PRESENCE_COLORS.length]
        })));
        break;

      case 'collaborator_joined':
        setCollaborators(prev => {
          const collaborator = data.collaborator as CollaboratorData;
          const existing = prev.find(c => c.userId === collaborator.userId);
          if (existing) return prev;
          
          return [...prev, {
            ...collaborator,
            lastSeen: new Date(collaborator.lastSeen),
            color: PRESENCE_COLORS[prev.length % PRESENCE_COLORS.length]
          }];
        });
        break;

      case 'collaborator_left':
        setCollaborators(prev => 
          prev.filter(c => c.userId !== (data.userId as number))
        );
        break;

      case 'presence_update':
        setCollaborators(prev =>
          prev.map(c =>
            c.userId === (data.userId as number)
              ? { ...c, ...(data.presence as Partial<CollaboratorPresence>), lastSeen: new Date() }
              : c
          )
        );
        break;

      case 'cursor_update':
        setCollaborators(prev =>
          prev.map(c =>
            c.userId === (data.userId as number)
              ? { ...c, cursor: data.cursor as { x: number; y: number }, lastSeen: new Date() }
              : c
          )
        );
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  };

  // Send cursor position updates
  const updateCursor = (x: number, y: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Throttle cursor updates
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }

      cursorTimeoutRef.current = setTimeout(() => {
        wsRef.current?.send(JSON.stringify({
          type: 'cursor_update',
          cursor: { x, y },
          timestamp: new Date().toISOString()
        }));
      }, 100);
    }
  };

  // Send section focus updates
  const updateSection = (sectionId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'section_focus',
        sectionId,
        timestamp: new Date().toISOString()
      }));
    }
  };

  // Send activity updates (editing, viewing, etc.)
  const sendActivity = (activityType: string, data: ActivityData) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'activity_update',
        activityType,
        data,
        timestamp: new Date().toISOString()
      }));
    }
  };

  // Get active collaborators (excluding current user and inactive ones)
  const activeCollaborators = collaborators.filter(c => 
    c.userId !== userId && 
    c.isActive &&
    new Date().getTime() - new Date(c.lastSeen).getTime() < 60000 // Active within last minute
  );

  return {
    collaborators: activeCollaborators,
    isConnected,
    connectionError,
    updateCursor,
    updateSection,
    sendActivity,
    totalCollaborators: activeCollaborators.length
  };
}