import { ReactNode } from 'react';
import { User as ApiUser } from '@/types/api';
import type { Notification as AppNotification } from '@/types/notification';

export type { AppNotification };

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

// Extend the API User type to handle both string and number IDs and add missing fields
export type User = Omit<ApiUser, 'id'> & { 
  id: string | number;
  avatarUrl?: string | null;
  name?: string;
  firstName?: string | null;
  lastName?: string | null;
};

export interface NavigationProps {
  isAuthenticated: boolean;
  user?: User | null;
  notifications: AppNotification[];
  onSignOut: () => Promise<void>;
  onNotificationClick: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onSignIn?: () => void;
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
  notifications: AppNotification[];
  onNotificationClick: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onNotificationsClick: () => void;
}
