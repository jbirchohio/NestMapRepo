/**
 * Types related to real-time collaboration features
 */

import type { ActivityAction } from '../../constants/ActivityActions.js';

export interface CollaborationPresenceProps {
    tripId: string;
    organizationId: string; // Made required to match useRealTimeCollaboration expectations
    userId: number;
    showCursors?: boolean;
    showActivityFeed?: boolean;
}

export interface RecentActivityItem {
    id: string;
    userId: number;
    username: string;
    action: ActivityAction;
    section?: string;
    timestamp: Date;
    avatar?: string;
    timeAgo: string;
    userColor?: string;
}

export interface SectionCollaborationProps {
    sectionId: string;
    children: React.ReactNode;
    updateSection: (sectionId: string) => void;
    sendActivity?: (activityType: string, data: unknown) => void;
}
