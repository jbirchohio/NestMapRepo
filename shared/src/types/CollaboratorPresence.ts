/**
 * Represents a collaborator's presence in the real-time collaboration system
 */
export interface CollaboratorPresence {
    userId: number;
    username: string;
    email?: string;
    avatar?: string;
    currentPage: string;
    currentSection?: string;
    cursor?: {
        x: number;
        y: number;
    };
    lastSeen: Date;
    isActive: boolean;
    color: string;
    role?: string;
    permissions?: string[];
}
