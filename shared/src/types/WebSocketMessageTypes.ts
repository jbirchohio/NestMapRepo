import type { SharedCollaboratorType } from './SharedCollaboratorType.js';

export type WebSocketMessage = 
  | { type: 'collaborators_list'; collaborators: SharedCollaboratorType[] }
  | { type: 'collaborator_joined' | 'collaborator_left' | 'collaborator_updated'; collaborator: SharedCollaboratorType }
  | { type: 'cursor_update'; userId: number; cursor?: { x: number; y: number }; currentPage: string; currentSection?: string }
  | { type: 'presence_update'; presence: { userId: number; isActive: boolean; lastSeen: Date } }
  | { type: 'activity_update'; activity: unknown };
