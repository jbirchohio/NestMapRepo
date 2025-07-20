import React from 'react';
import { Link } from 'react-router-dom';
import { NavigationLink } from './NavigationLink';
import { NotificationsMenu } from './NotificationsMenu';
import { UserMenu } from './UserMenu';
import { DesktopNavigationProps } from './types';
import { UserIcon, CogIcon, LogoutIcon } from '../icons';

export const DesktopNavigation: React.FC<DesktopNavigationProps> = ({
  isAuthenticated,
  user,
  navigationItems,
  notifications,
  isProfileMenuOpen,
  isNotificationsOpen,
  onProfileClick,
  onNotificationsClick,
  onNotificationClick,
  onMarkAllAsRead,
  onSignOut,
  onCloseAllMenus,
}) => {
  const userMenuItems = [
    {
      name: 'Your Profile',
      href: '/profile',
      icon: <UserIcon className="h-5 w-5" aria-hidden="true" />,
      onClick: onCloseAllMenus,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: <CogIcon className="h-5 w-5" aria-hidden="true" />,
      onClick: onCloseAllMenus,
    },
    {
      name: 'Sign out',
      href: '#',
      icon: <LogoutIcon className="h-5 w-5" aria-hidden="true" />,
      onClick: onSignOut,
    },
  ];

  return (
    <div className="hidden md:flex md:items-center md:space-x-4">
      <nav className="flex-1 flex items-center justify-center">
        <div className="flex space-x-8">
          {navigationItems.map((item) => (
            <NavigationLink
              key={item.name}
              {...item}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            />
          ))}
        </div>
      </nav>

      <div className="flex items-center">
        {isAuthenticated && (
          <>
            <NotificationsMenu
              isOpen={isNotificationsOpen}
              onClose={onCloseAllMenus}
              notifications={notifications}
              onNotificationClick={onNotificationClick}
              onMarkAllAsRead={onMarkAllAsRead}
              onNotificationsClick={onNotificationsClick}
            />

            <UserMenu
              isOpen={isProfileMenuOpen}
              onClose={onCloseAllMenus}
              user={user}
              onSignOut={onSignOut}
              items={userMenuItems}
              onProfileClick={onProfileClick}
            />
          </>
        )}

        {!isAuthenticated && (
          <div className="flex space-x-4">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
