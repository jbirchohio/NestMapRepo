/**
 * Represents a collaborator in the real-time collaboration system
 */
export interface SharedCollaboratorType {
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
    lastSeen: Date | string;
    isActive: boolean;
    color?: string;
    role?: string;
    permissions?: string[];
}

export default SharedCollaboratorType;
