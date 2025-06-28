/**
 * Types related to user activities in the application
 */

import type { ActivityAction } from '../../constants/ActivityActions.js';

/**
 * Represents data for a section edit operation
 */
export interface SectionEditData {
    sectionId: string;
    [key: string]: unknown;
}

/**
 * Represents an activity in the system
 */
export interface ActivityData {
    id: string;
    userId: number;
    username: string;
    action: ActivityAction;
    section?: string;
    timestamp: Date;
    timeAgo: string;
    userColor: string;
    metadata?: Record<string, unknown>;
    resourceId?: string;
    resourceType?: string;
    organizationId?: string;
}

/**
 * Properties for the useRealTimeCollaboration hook
 */
export interface UseRealTimeCollaborationProps {
    tripId: string;
    organizationId: string;
    userId: number | null;
    onActivity?: (activity: ActivityData) => void;
    onPresenceChange?: (presence: UserPresence[]) => void;
}

/**
 * Represents a user's presence in the system
 */
export interface UserPresence {
    userId: number;
    username: string;
    color: string;
    lastActive: Date;
    online: boolean;
    activeSection?: string;
}

/**
 * Filter options for querying activities
 */
export interface ActivityFilterOptions {
    userId?: number | number[];
    action?: ActivityAction | ActivityAction[];
    section?: string | string[];
    resourceId?: string | string[];
    resourceType?: string | string[];
    organizationId?: string | string[];
    startDate?: Date;
    endDate?: Date;
}

/**
 * Pagination options for activity queries
 */
export interface ActivityPaginationOptions {
    limit?: number;
    offset?: number;
    orderBy?: 'asc' | 'desc';
    orderField?: keyof ActivityData;
}

/**
 * Response type for paginated activity queries
 */
export interface PaginatedActivityResponse {
    data: ActivityData[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

/**
 * Payload for creating a new activity
 */
export interface CreateActivityPayload {
    userId: number;
    username: string;
    action: ActivityAction;
    section?: string;
    metadata?: Record<string, unknown>;
    resourceId?: string;
    resourceType?: string;
    organizationId?: string;
}

/**
 * Event types for real-time collaboration
 */
export enum CollaborationEventType {
    ACTIVITY_CREATED = 'activity:created',
    USER_JOINED = 'user:joined',
    USER_LEFT = 'user:left',
    USER_UPDATED = 'user:updated',
    PRESENCE_UPDATE = 'presence:update',
    SECTION_LOCKED = 'section:locked',
    SECTION_UNLOCKED = 'section:unlocked',
}

/**
 * Base interface for all collaboration events
 */
export interface CollaborationEvent<T = unknown> {
    type: CollaborationEventType;
    timestamp: Date;
    payload: T;
}

/**
 * Payload for activity created event
 */
export interface ActivityCreatedPayload {
    activity: ActivityData;
}

/**
 * Payload for user presence events
 */
export interface UserPresencePayload {
    user: UserPresence;
}

/**
 * Payload for section lock events
 */
export interface SectionLockPayload {
    sectionId: string;
    userId: number;
    username: string;
}
