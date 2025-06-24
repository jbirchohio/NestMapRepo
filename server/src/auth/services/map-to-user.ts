import { UserResponse } from '@shared/types/auth/dto/user-response.dto.js';

/**
 * Maps a UserResponse object to a User object with snake_case properties
 * @param userResponse - The UserResponse object to map from
 * @param user - The original user object from the database
 * @returns A User object with snake_case properties
 */
export function mapToUser(userResponse: UserResponse, user: any): any {
    return {
        id: userResponse.id,
        email: userResponse.email,
        first_name: user.first_name || userResponse.firstName || '',
        last_name: user.last_name || userResponse.lastName || '',
        full_name: user.full_name || userResponse.displayName || '',
        role: userResponse.role,
        organization_id: user.organization_id || null,
        email_verified: userResponse.emailVerified,
        created_at: user.created_at || userResponse.createdAt,
        updated_at: user.updated_at || userResponse.updatedAt,
        last_login_at: user.last_login_at || userResponse.lastLoginAt || null,
        avatar_url: user.avatar_url || userResponse.avatarUrl || null,
        status: user.status || 'active',
        // Include any additional fields from the original user object
        ...user
    };
}
