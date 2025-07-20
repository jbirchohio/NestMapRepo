import { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MenuIcon, XIcon, BarChartIcon, CheckIcon, FileTextIcon, HomeIcon } from '../icons';
import { MobileMenu } from './MobileMenu';
import { DesktopNavigation } from './DesktopNavigation';
import type { NavigationItem, User } from './types';
import type { Notification as AppNotification } from '@/types/notification';

interface MainNavigationProps {
  isAuthenticated: boolean;
  user: User | null;
  notifications: AppNotification[];
  onSignOut: () => Promise<void>;
  onNotificationClick: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onSignIn?: () => void;
}

export const MainNavigation: React.FC<MainNavigationProps> = ({
  isAuthenticated,
  user,
  notifications = [],
  onSignOut,
  onNotificationClick,
  onMarkAllAsRead,
  onSignIn,
}) => {
  const navigate = useNavigate();
  
  // State for mobile menu and dropdowns
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  // Refs for handling outside clicks
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Navigation items - enterprise landing page
  const navigationItems: NavigationItem[] = isAuthenticated ? [
    // Authenticated user navigation
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <HomeIcon className="h-5 w-5" aria-hidden="true" /> as ReactNode,
      ariaLabel: 'Dashboard',
      requiresAuth: true
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: <BarChartIcon className="h-5 w-5" aria-hidden="true" /> as ReactNode,
      ariaLabel: 'Analytics',
      requiresAuth: true
    },
    {
      name: 'Reports',
      href: '/custom-reports',
      icon: <FileTextIcon className="h-5 w-5" aria-hidden="true" /> as ReactNode,
      ariaLabel: 'Reports',
      requiresAuth: true
    },
    {
      name: 'Enterprise',
      href: '/enterprise-integration',
      icon: <CheckIcon className="h-5 w-5" aria-hidden="true" /> as ReactNode,
      ariaLabel: 'Enterprise Integration',
      requiresAuth: true
    },
  ] : [
    // Public/enterprise landing navigation
    {
      name: 'Home',
      href: '/',
      icon: <HomeIcon className="h-5 w-5" aria-hidden="true" /> as ReactNode,
      ariaLabel: 'Home',
      requiresAuth: false
    },
    {
      name: 'Features',
      href: '/#features',
      icon: <BarChartIcon className="h-5 w-5" aria-hidden="true" /> as ReactNode,
      ariaLabel: 'Features',
      requiresAuth: false
    },
    {
      name: 'Pricing',
      href: '/#pricing',
      icon: <FileTextIcon className="h-5 w-5" aria-hidden="true" /> as ReactNode,
      ariaLabel: 'Pricing',
      requiresAuth: false
    },
    {
      name: 'Contact',
      href: 'mailto:sales@nestmap.com?subject=Discovery Call Request',
      icon: <CheckIcon className="h-5 w-5" aria-hidden="true" /> as ReactNode,
      ariaLabel: 'Contact Sales',
      requiresAuth: false
    },
  ];

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close all menus
  const closeAllMenus = useCallback((): void => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
    setIsNotificationsOpen(false);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    closeAllMenus();
  }, [navigate, closeAllMenus]);

  // Toggle mobile menu
  const toggleMobileMenu = useCallback((): void => {
    setIsMobileMenuOpen(prev => !prev);
    setIsProfileMenuOpen(false);
    setIsNotificationsOpen(false);
  }, []);

  // Toggle profile menu
  const toggleProfileMenu = useCallback((): void => {
    setIsProfileMenuOpen(prev => !prev);
    setIsNotificationsOpen(false);
  }, []);

  // Toggle notifications menu
  const toggleNotificationsMenu = useCallback((): void => {
    setIsNotificationsOpen(prev => !prev);
    setIsProfileMenuOpen(false);
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback(async (id: string) => {
    try {
      await onNotificationClick(id);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  }, [onNotificationClick]);

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await onMarkAllAsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [onMarkAllAsRead]);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    try {
      await onSignOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [onSignOut, navigate]);

  return (
    <header className="bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
              onClick={toggleMobileMenu}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <XIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <MenuIcon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Logo */}
          <div className="flex flex-shrink-0 items-center">
            <Link to="/" className="text-xl font-bold text-gray-900">
              NestMap
            </Link>
          </div>

          {/* Desktop Navigation */}
          <DesktopNavigation
            isAuthenticated={isAuthenticated}
            user={user}
            navigationItems={navigationItems}
            notifications={notifications}
            isProfileMenuOpen={isProfileMenuOpen}
            isNotificationsOpen={isNotificationsOpen}
            onProfileClick={toggleProfileMenu}
            onNotificationsClick={toggleNotificationsMenu}
            onNotificationClick={handleNotificationClick}
            onMarkAllAsRead={handleMarkAllAsRead}
            onSignOut={handleSignOut}
            onCloseAllMenus={closeAllMenus}
            onSignIn={onSignIn}
          />
        </div>
      </div>

      {/* Mobile menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={closeAllMenus}
        isAuthenticated={isAuthenticated}
        user={user}
        navigationItems={navigationItems}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllAsRead={handleMarkAllAsRead}
        onSignOut={handleSignOut}
      />
    </header>
  );
};
