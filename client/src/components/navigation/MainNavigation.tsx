import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'wouter';
import { MenuIcon, XIcon, BarChartIcon, CheckIcon, FileTextIcon, HomeIcon } from '../icons';
import { useAuth } from '../../contexts/auth/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { MobileMenu } from './MobileMenu';
import { DesktopNavigation } from './DesktopNavigation';
import { NavigationItem } from './types';

export const MainNavigation: React.FC = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const [location] = useLocation();
  const navigate = useNavigate();
  const { notifications = [], markAsRead, markAllAsRead } = useNotifications();
  
  // State for mobile menu and dropdowns
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  // Refs for handling outside clicks
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Navigation items
  const navigationItems: NavigationItem[] = [
    {
      name: 'Home',
      href: '/',
      icon: <HomeIcon className="h-5 w-5" aria-hidden="true" />,
      ariaLabel: 'Home',
      requiresAuth: false
    },
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <BarChartIcon className="h-5 w-5" aria-hidden="true" />,
      ariaLabel: 'Dashboard',
      requiresAuth: true
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: <BarChartIcon className="h-5 w-5" aria-hidden="true" />,
      ariaLabel: 'Analytics',
      requiresAuth: true
    },
    {
      name: 'Approvals',
      href: '/approvals',
      icon: <CheckIcon className="h-5 w-5" aria-hidden="true" />,
      ariaLabel: 'Approvals',
      requiresAuth: true
    },
    {
      name: 'Invoices',
      href: '/invoice-center',
      icon: <FileTextIcon className="h-5 w-5" aria-hidden="true" />,
      ariaLabel: 'Invoices',
      requiresAuth: true
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
  const closeAllMenus = useCallback(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
    setIsNotificationsOpen(false);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    closeAllMenus();
  }, [location, closeAllMenus]);

  // Toggle functions
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const toggleProfileMenu = useCallback(() => {
    setIsProfileMenuOpen(prev => !prev);
  }, []);

  const toggleNotifications = useCallback(() => {
    setIsNotificationsOpen(prev => !prev);
  }, []);  

  // Handle notification click
  const handleNotificationClick = useCallback(async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      setIsNotificationsOpen(false);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  }, [markAsRead]);

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  }, [markAllAsRead]);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  }, [signOut, navigate]);

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
            <Link href="/" className="text-xl font-bold text-gray-900">
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
            onNotificationsClick={toggleNotifications}
            onNotificationClick={handleNotificationClick}
            onMarkAllAsRead={handleMarkAllAsRead}
            onSignOut={handleSignOut}
            onCloseAllMenus={closeAllMenus}
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
