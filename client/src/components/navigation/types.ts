import { ReactNode } from 'react';
<<<<<<< Updated upstream
import type { User as ApiUser } from '@shared/types/user';
import type { SharedNotificationType } from '@shared/types/notification';

// Re-export for backward compatibility
export type AppNotification = SharedNotificationType;
=======
import type { User as ApiUser } from '@shared/types/auth/user';
import type { Notification as AppNotification } from '@shared/types/notification';
// Export as AppNotification to avoid conflict with the browser's Notification type
export type { AppNotification };
>>>>>>> Stashed changes
export interface NavigationItem {
    name: string;
    href: string;
    icon: ReactNode;
    ariaLabel: string;
    requiresAuth: boolean;
}
export interface UserNavigationItem {
    name: string;
    href: string;
    icon: ReactNode;
    onClick?: () => void | Promise<void>;
}
// Extend the API User type to handle both string and number IDs
export type User = Omit<ApiUser, 'id'> & {
    id: string | number;
};
export interface NavigationProps {
    isAuthenticated: boolean;
    user?: User | null;
    notifications: SharedNotificationType[];
    onSignOut: () => Promise<void>;
    onNotificationClick: (id: string) => Promise<void>;
    onMarkAllAsRead: () => Promise<void>;
    onNotificationsClick: () => void;
}
export interface MobileMenuProps extends NavigationProps {
    isOpen: boolean;
    onClose: () => void;
    navigationItems: NavigationItem[];
}
export interface DesktopNavigationProps extends NavigationProps {
    navigationItems: NavigationItem[];
    isProfileMenuOpen: boolean;
    isNotificationsOpen: boolean;
    onProfileClick: () => void;
    onNotificationsClick: () => void;
    onCloseAllMenus: () => void;
}
export interface UserMenuProps {
    isOpen: boolean;
    onClose: () => void;
    user?: User | null;
    onSignOut: () => Promise<void>;
    items: UserNavigationItem[];
    onProfileClick: () => void;
}
export interface NotificationsMenuProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: SharedNotificationType[];
    onNotificationClick: (id: string) => Promise<void>;
    onMarkAllAsRead: () => Promise<void>;
    onNotificationsClick: () => void;
}
