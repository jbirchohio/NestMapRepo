export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    role: 'user' | 'admin' | 'moderator';
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    lastLogin?: string;
    preferences?: {
        theme?: 'light' | 'dark' | 'system';
        notifications?: {
            email?: boolean;
            push?: boolean;
            inApp?: boolean;
        };
        [key: string]: any;
    };
}
