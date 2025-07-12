export const USER_ROLES = {
    SUPERADMIN_OWNER: 'superadmin_owner',
    SUPERADMIN_STAFF: 'superadmin_staff',
    SUPERADMIN_AUDITOR: 'superadmin_auditor',
    ADMIN: 'admin',
    MANAGER: 'manager',
    MEMBER: 'member',
    USER: 'user',
    GUEST: 'guest',
};
export const TRIP_ROLES = {
    ADMIN: 'admin',
    EDITOR: 'editor',
    VIEWER: 'viewer',
    COMMENTER: 'commenter',
};
export const ORGANIZATION_PLANS = {
    FREE: 'free',
    TEAM: 'team',
    PRO: 'pro',
    ENTERPRISE: 'enterprise',
};
export const ORGANIZATION_PERMISSIONS = {
    VIEW_ALL_TRIPS: 'view_all_trips',
    EDIT_ALL_TRIPS: 'edit_all_trips',
    CREATE_TRIPS: 'create_trips',
    DELETE_TRIPS: 'delete_trips',
    INVITE_MEMBERS: 'invite_members',
    MANAGE_MEMBERS: 'manage_members',
    VIEW_MEMBERS: 'view_members',
    MANAGE_BUDGETS: 'manage_budgets',
    EXPORT_DATA: 'export_data',
    ACCESS_ANALYTICS: 'access_analytics',
    MANAGE_ORGANIZATION: 'manage_organization',
    BILLING_ACCESS: 'billing_access',
};
export function transformTripToFrontend(trip) {
    return {
        id: trip.id,
        title: trip.title,
        startDate: trip.startDate,
        endDate: trip.endDate,
        userId: trip.userId,
        organizationId: trip.organizationId,
        collaborators: trip.collaborators,
        isPublic: trip.isPublic,
        shareCode: trip.shareCode,
        sharingEnabled: trip.sharingEnabled,
        sharePermission: trip.sharePermission,
        city: trip.city,
        country: trip.country,
        location: trip.location,
        cityLatitude: trip.cityLatitude,
        cityLongitude: trip.cityLongitude,
        hotel: trip.hotel,
        hotelLatitude: trip.hotelLatitude,
        hotelLongitude: trip.hotelLongitude,
        completed: trip.completed,
        completedAt: trip.completedAt,
        tripType: trip.tripType,
        clientName: trip.clientName,
        projectType: trip.projectType,
        budget: trip.budget,
        createdAt: trip.createdAt,
        updatedAt: trip.updatedAt,
    };
}
export function transformActivityToFrontend(activity) {
    return {
        id: activity.id,
        tripId: activity.tripId,
        organizationId: activity.organizationId,
        title: activity.title,
        date: activity.date,
        time: activity.time,
        locationName: activity.locationName,
        latitude: activity.latitude,
        longitude: activity.longitude,
        notes: activity.notes,
        tag: activity.tag,
        assignedTo: activity.assignedTo,
        order: activity.order,
        travelMode: activity.travelMode,
        completed: activity.completed,
    };
}
//# sourceMappingURL=schema.js.map