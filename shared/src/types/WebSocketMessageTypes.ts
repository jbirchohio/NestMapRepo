import type { SharedCollaboratorType } from './SharedCollaboratorType.js';

/**
 * WebSocket message types for real-time collaboration features.
 * All message types use camelCase to follow TypeScript/JavaScript conventions.
 */
export type WebSocketMessage = 
  | { type: 'collaboratorsList'; collaborators: SharedCollaboratorType[] }
  | { type: 'collaboratorJoined' | 'collaboratorLeft' | 'collaboratorUpdated'; collaborator: SharedCollaboratorType }
  | { type: 'cursorUpdate'; userId: number; cursor?: { x: number; y: number }; currentPage: string; currentSection?: string }
  | { type: 'presenceUpdate'; presence: { userId: number; isActive: boolean; lastSeen: Date } }
  | { type: 'activityUpdate'; activity: unknown }
  | { type: 'sectionUpdated'; sectionId: string; timestamp: string };
