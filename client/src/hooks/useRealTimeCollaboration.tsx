import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

interface WebSocketMessage {
  type: string;
  collaborators?: CollaboratorPresence[];
  collaborator?: CollaboratorPresence;
  [key: string]: unknown;
}

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
        if (data.collaborators) {
          setCollaborators(data.collaborators.map((collab: CollaboratorPresence, index: number) => ({
            ...collab,
            color: PRESENCE_COLORS[index % PRESENCE_COLORS.length]
          })));
        }
        break;

      case 'collaborator_joined':
        if (data.collaborator && typeof data.collaborator === 'object') {
          const collaborator = data.collaborator as Partial<CollaboratorPresence>;
          setCollaborators(prev => {
            // Safe check for userId being a number
            if (typeof collaborator.userId !== 'number') return prev;
            
            const existing = prev.find(c => c.userId === collaborator.userId);
            if (existing) return prev;
            
            // Create a properly typed collaborator object
            const newCollaborator: CollaboratorPresence = {
              userId: collaborator.userId,
              username: collaborator.username || 'Unknown User',
              avatar: collaborator.avatar,
              currentPage: collaborator.currentPage || '',
              currentSection: collaborator.currentSection,
              cursor: collaborator.cursor || { x: 0, y: 0 },
              lastSeen: collaborator.lastSeen instanceof Date ? collaborator.lastSeen : new Date(),
              isActive: collaborator.isActive ?? true,
              color: PRESENCE_COLORS[prev.length % PRESENCE_COLORS.length]
            };
            
            return [...prev, newCollaborator];
          });
        }
        break;

      case 'collaborator_left':
        setCollaborators(prev => 
          prev.filter(c => c.userId !== data.userId)
        );
        break;

      case 'presence_update':
        if (data.userId && typeof data.presence === 'object' && data.presence !== null) {
          setCollaborators(prev =>
            prev.map(c =>
              c.userId === data.userId
                ? { 
                    ...c, 
                    // Only update properties that exist in CollaboratorPresence
                    ...(data.presence as Partial<CollaboratorPresence>),
                    lastSeen: new Date() 
                  }
                : c
            )
          );
        }
        break;

      case 'cursor_update':
        if (data.userId && data.cursor) {
          // Safely cast cursor to an appropriate type
          const cursor = data.cursor as unknown;
          let typedCursor = { x: 0, y: 0 };
          
          // Check if cursor is an object with x and y properties
          if (cursor && typeof cursor === 'object' && cursor !== null) {
            const cursorObj = cursor as Record<string, unknown>;
            if ('x' in cursorObj && typeof cursorObj.x === 'number') {
              typedCursor.x = cursorObj.x;
            }
            if ('y' in cursorObj && typeof cursorObj.y === 'number') {
              typedCursor.y = cursorObj.y;
            }
          }
          
          setCollaborators(prev =>
            prev.map(c =>
              c.userId === data.userId
                ? { 
                    ...c, 
                    cursor: typedCursor, 
                    lastSeen: new Date() 
                  }
                : c
            )
          );
        }
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
  const sendActivity = (activityType: string, data: Record<string, unknown>) => {
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
