import type { Activity, ActivityStatus, ActivityType } from '@shared/types/activity.js';

/**
 * Interface for Activity repository operations
 */
export interface ActivityRepository {
    /**
     * Find an activity by its ID
     * @param id - The ID of the activity to find
     * @returns The activity if found, null otherwise
     */
    findById(id: string): Promise<Activity | null>;

    /**
     * Find all activities for a specific trip
     * @param tripId - The ID of the trip
     * @returns Array of activities for the trip
     */
    findByTripId(tripId: string): Promise<Activity[]>;

    /**
     * Find all activities in the system
     * @returns Array of all activities
     */
    findAll(): Promise<Activity[]>;

    /**
     * Create a new activity
     * @param activityData - The activity data to create
     * @returns The created activity
     */
    create(activityData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Activity>;

    /**
     * Update an existing activity
     * @param id - The ID of the activity to update
     * @param activityData - The data to update
     * @returns The updated activity or null if not found
     */
    update(id: string, activityData: Partial<Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Activity | null>;

    /**
     * Delete an activity
     * @param id - The ID of the activity to delete
     * @returns True if the activity was deleted, false otherwise
     */
    delete(id: string): Promise<boolean>;

    /**
     * Create multiple activities in a single transaction
     * @param activitiesData - Array of activity data to create
     * @returns Array of created activities
     */
    createMany(activitiesData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Activity[]>;

    /**
     * Delete all activities for a specific trip
     * @param tripId - The ID of the trip
     * @returns True if any activities were deleted, false otherwise
     */
    deleteByTripId(tripId: string): Promise<boolean>;

    /**
     * Find activities within a date range for a specific trip
     * @param tripId - The ID of the trip
     * @param startDate - The start of the date range
     * @param endDate - The end of the date range
     * @returns Array of activities within the date range
     */
    findByDateRange(tripId: string, startDate: Date, endDate: Date): Promise<Activity[]>;

    /**
     * Reschedule an activity
     * @param activityId - The ID of the activity to reschedule
     * @param startDate - The new start date/time
     * @param endDate - The new end date/time
     * @returns The updated activity or null if not found
     */
    reschedule(activityId: string, startDate: Date, endDate: Date): Promise<Activity | null>;

    /**
     * Update an activity's status
     * @param id - The ID of the activity
     * @param status - The new status
     * @returns The updated activity or null if not found
     */
    updateStatus(id: string, status: ActivityStatus): Promise<Activity | null>;

    /**
     * Find activities by type and status
     * @param type - The type of activities to find
     * @param status - The status to filter by (optional)
     * @returns Array of matching activities
     */
    findByType(type: ActivityType, status?: ActivityStatus): Promise<Activity[]>;
}
