import { ReactNode } from 'react';

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

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  action?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface NavigationProps {
  isAuthenticated: boolean;
  user?: User | null;
  notifications: Notification[];
  onSignOut: () => Promise<void>;
  onNotificationClick: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
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
}

export interface NotificationsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onNotificationClick: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
}
