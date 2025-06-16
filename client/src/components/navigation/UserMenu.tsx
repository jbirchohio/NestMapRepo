import { motion, AnimatePresence } from 'framer-motion';
import { UserIcon } from '../icons';
import { UserMenuProps } from './types';

export const UserMenu: React.FC<UserMenuProps> = ({
  isOpen,
  onClose,
  user,
  onSignOut,
  items,
}) => {
  return (
    <div className="relative ml-3" ref={ref}>
      <button
        type="button"
        className="flex max-w-xs items-center rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        id="user-menu-button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={onProfileClick}
      >
        <span className="sr-only">Open user menu</span>
        {user?.avatarUrl ? (
          <img
            className="h-8 w-8 rounded-full"
            src={user.avatarUrl}
            alt={`${user.name}'s avatar`}
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600">
            <UserIcon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="user-menu"
          >
            <div className="px-4 py-3">
              <p className="text-sm text-gray-900">{user?.name}</p>
              <p className="truncate text-sm text-gray-500">{user?.email}</p>
            </div>
            <div className="border-t border-gray-100">
              {items.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={(e) => {
                    e.preventDefault();
                    item.onClick?.();
                    onClose();
                  }}
                  role="menuitem"
                >
                  <div className="flex items-center">
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
