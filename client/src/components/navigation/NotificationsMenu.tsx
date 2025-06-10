import { motion, AnimatePresence } from 'framer-motion';
import { BellIcon } from '../Icons';
import { NotificationsMenuProps } from './types';

export const NotificationsMenu: React.FC<NotificationsMenuProps> = ({
  isOpen,
  onClose,
  notifications,
  onNotificationClick,
  onMarkAllAsRead,
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative ml-3" ref={ref}>
      <button
        type="button"
        className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        onClick={onNotificationsClick}
        aria-label={isOpen ? 'Close notifications' : 'Open notifications'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <BellIcon className="h-6 w-6" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="notifications-menu"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
              <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">No notifications</div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => onNotificationClick(notification.id)}
                    className={`block w-full px-4 py-2 text-left text-sm ${
                      notification.read ? 'text-gray-500' : 'bg-blue-50 text-gray-900'
                    } hover:bg-gray-50`}
                  >
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm">{notification.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <span className="ml-2 h-2 w-2 rounded-full bg-blue-500"></span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
