/**
 * Types related to user activities in the application
 */

import type { ActivityAction } from '../../constants/ActivityActions.js';

export interface SectionEditData {
    sectionId: string;
    [key: string]: unknown;
}

export interface ActivityData {
    id: string;
    userId: number;
    username: string;
    action: ActivityAction;
    section?: string;
    timestamp: Date;
    timeAgo: string;
    userColor: string;
}

export interface UseRealTimeCollaborationProps {
    tripId: string;
    organizationId: string;
    userId: number | null;
    onActivity?: (activity: ActivityData) => void;
}
