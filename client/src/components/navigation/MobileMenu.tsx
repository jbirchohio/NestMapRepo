import { motion, AnimatePresence } from 'framer-motion';
import { XIcon } from '../Icons';
import { NavigationLink } from './NavigationLink';
import { MobileMenuProps } from './types';

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  user,
  navigationItems,
  notifications,
  onNotificationClick,
  onMarkAllAsRead,
  onSignOut,
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Mobile menu */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', ease: 'easeInOut' }}
            className="fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto bg-white"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center justify-between px-4">
                <div className="text-lg font-semibold text-gray-900">Menu</div>
                <button
                  type="button"
                  className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                  onClick={onClose}
                  aria-label="Close menu"
                >
                  <XIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 px-2 py-4">
                {navigationItems.map((item) => (
                  <NavigationLink
                    key={item.name}
                    {...item}
                    onClick={onClose}
                    className="block rounded-md px-3 py-2 text-base font-medium"
                  />
                ))}
              </nav>

              {isAuthenticated && user && (
                <div className="border-t border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="mr-3">
                      {user.avatarUrl ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={user.avatarUrl}
                          alt={user.name}
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-600">
                          <UserIcon className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1">
                    <button
                      onClick={async () => {
                        await onSignOut();
                        onClose();
                      }}
                      className="block w-full rounded-md px-3 py-2 text-left text-base font-medium text-red-600 hover:bg-red-50"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
