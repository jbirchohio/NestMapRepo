import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import type { WebSocketMessage } from '@shared/types/WebSocketMessageTypes';
import type { CollaboratorPresence } from '@shared/types/CollaboratorPresence';
import type { UseRealTimeCollaborationProps, ActivityData } from '@shared/types/activity/ActivityTypes';
import { ACTIVITY_ACTIONS } from '@shared/constants/ActivityActions.js';
// Import base message types
import { WS_MESSAGE_TYPES as BASE_WS_MESSAGE_TYPES } from '@shared/schema/constants/WebSocketMessageTypes.js';

// Define our own message types that include section_updated
type ExtendedMessageTypes = {
    [K in keyof typeof BASE_WS_MESSAGE_TYPES]: typeof BASE_WS_MESSAGE_TYPES[K];
} & {
    SECTION_UPDATED: 'section_updated';
};

// Create the actual constants object
const WS_MESSAGE_TYPES: ExtendedMessageTypes = {
    ...BASE_WS_MESSAGE_TYPES,
    SECTION_UPDATED: 'section_updated'
} as const;

type ActivityAction = typeof ACTIVITY_ACTIONS[keyof typeof ACTIVITY_ACTIONS];



const PRESENCE_COLORS = [
    '#2563eb', '#dc2626', '#059669', '#7c3aed', '#ea580c',
    '#0891b2', '#c2410c', '#be123c', '#4338ca', '#0d9488'
];

export function useRealTimeCollaboration({ tripId, organizationId, userId, onActivity }: UseRealTimeCollaborationProps) {
    const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const location = useLocation();
    const heartbeatRef = useRef<NodeJS.Timeout>();
    const cursorTimeoutRef = useRef<NodeJS.Timeout>();

    // Establish WebSocket connection
    useEffect(() => {
        if (!tripId || !userId)
            return;
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
                }
                catch (error) {
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
        }
        catch (error) {
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
                type: WS_MESSAGE_TYPES.PRESENCE_UPDATE,
                currentPage: location,
                timestamp: new Date().toISOString()
            }));
        }
    }, [location]);
    const handleWebSocketMessage = (data: WebSocketMessage) => {
        switch (data.type) {
            case WS_MESSAGE_TYPES.COLLABORATORS_LIST:
                setCollaborators(data.collaborators.map<CollaboratorPresence>((collab, index) => ({
                    ...collab,
                    color: PRESENCE_COLORS[index % PRESENCE_COLORS.length] || '#000000',
                    lastSeen: new Date(),
                    isActive: true,
                    cursor: collab.cursor
                })));
                break;
            case WS_MESSAGE_TYPES.COLLABORATOR_JOINED:
                setCollaborators(prev => {
                    const newCollaborator: CollaboratorPresence = {
                        ...data.collaborator,
                        color: PRESENCE_COLORS[prev.length % PRESENCE_COLORS.length] || '#000000',
                        lastSeen: new Date(),
                        isActive: true,
                        cursor: data.collaborator.cursor
                    };
                    return [...prev, newCollaborator];
                });
                break;
            case WS_MESSAGE_TYPES.COLLABORATOR_LEFT:
                setCollaborators(prev => prev.filter(c => c.userId !== data.collaborator.userId));
                break;
            case WS_MESSAGE_TYPES.COLLABORATOR_UPDATED:
                setCollaborators(prev => prev.map(c => 
                    c.userId === data.collaborator.userId 
                        ? { ...c, ...data.collaborator, lastSeen: new Date() } 
                        : c
                ));
                break;
            case WS_MESSAGE_TYPES.CURSOR_UPDATE:
                setCollaborators(prev => prev.map(c => 
                    c.userId === data.userId 
                        ? { 
                            ...c, 
                            cursor: data.cursor,
                            currentPage: data.currentPage,
                            currentSection: data.currentSection,
                            lastSeen: new Date()
                        } 
                        : c
                ));
                break;
            case WS_MESSAGE_TYPES.ACTIVITY_UPDATE: {
                if (onActivity && data.activity) {
                    const activity = data.activity as Partial<ActivityData>;
                    // Create a properly typed activity object with defaults
                    const activityWithDefaults: ActivityData = {
                        id: activity.id || `activity-${Date.now()}`,
                        userId: activity.userId || 0,
                        username: activity.username || 'Unknown',
                        action: activity.action || ACTIVITY_ACTIONS.VIEWED, // Use constant for default action
                        timestamp: activity.timestamp || new Date(),
                        timeAgo: 'just now',
                        userColor: activity.userColor || '#000000',
                        section: activity.section || '',
                        ...activity
                    } as const;
                    onActivity(activityWithDefaults);
                }
                break;
            }
            case WS_MESSAGE_TYPES.SECTION_UPDATED: {
                // Type guard to check if data has sectionId
                const sectionData = data as { sectionId?: string };
                if (sectionData.sectionId) {
                    // Handle section update logic here
                    console.log(`Section updated: ${sectionData.sectionId}`);
                }
                break;
            }
            case WS_MESSAGE_TYPES.PRESENCE_UPDATE:
                setCollaborators(prev => prev.map(c => 
                    c.userId === data.presence.userId 
                        ? { 
                            ...c, 
                            isActive: data.presence.isActive, 
                            lastSeen: data.presence.lastSeen,
                            color: c.color || PRESENCE_COLORS[prev.findIndex(cc => cc.userId === c.userId) % PRESENCE_COLORS.length] || '#000000'
                        } 
                        : c
                ));
                break;
        }
    };
    const updateCursor = (x: number, y: number) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            if (cursorTimeoutRef.current) {
                clearTimeout(cursorTimeoutRef.current);
            }
            cursorTimeoutRef.current = setTimeout(() => {
                wsRef.current?.send(JSON.stringify({
                    type: WS_MESSAGE_TYPES.CURSOR_UPDATE,
                    cursor: { x, y },
                    timestamp: new Date().toISOString()
                }));
            }, 100);
        }
    };
    const updateSection = (sectionId: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            // Use a type assertion since SECTION_UPDATED is not in our WS_MESSAGE_TYPES
            wsRef.current.send(JSON.stringify({
                type: 'section_updated' as const,
                sectionId,
                timestamp: new Date().toISOString()
            }));
        }
    };

    const sendActivity = useCallback((action: ActivityAction, data: Omit<Partial<ActivityData>, 'action' | 'id' | 'timestamp' | 'timeAgo'> = {}) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const activityData: ActivityData = {
                id: `activity-${Date.now()}`,
                userId: userId || 0,
                username: 'You',
                action,
                timestamp: new Date(),
                timeAgo: 'just now',
                userColor: '#000000',
                section: '',
                ...data
            } as const;
            
            wsRef.current.send(JSON.stringify({
                type: WS_MESSAGE_TYPES.ACTIVITY_UPDATE,
                activity: activityData
            }));
            
            // Only call onActivity if it exists
            if (onActivity) {
                onActivity(activityData);
            }
        }
    }, [onActivity, userId]);

    // Get active collaborators (excluding current user and inactive ones)
    const activeCollaborators = useCallback(() =>
        collaborators.filter(c => {
            const lastSeen = c.lastSeen ? new Date(c.lastSeen).getTime() : 0;
            return c.userId !== userId &&
                c.isActive &&
                (Date.now() - lastSeen) < 60000; // Active within last minute
        }),
        [collaborators, userId]
    );

    return {
        isConnected,
        connectionError,
        collaborators: activeCollaborators(),
        sendActivity,
        updateCursor,
        updateSection,
        totalCollaborators: activeCollaborators().length
    };
}
