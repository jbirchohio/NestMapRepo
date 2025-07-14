import React from 'react';
import { useWhiteLabel } from '@/contexts/WhiteLabelContext';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import MainNavigation from '@/components/MainNavigation';
import BrandedFooter from '@/components/BrandedFooter';
import { useToast } from '@/components/ui/use-toast';

interface MainLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
  hideFooter?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  hideNav = false,
  hideFooter = false,
}) => {
  const { config } = useWhiteLabel();
  const { user, signOut } = useAuth();
  const { notifications = [], markAsRead, markAllAsRead } = useNotifications();
  const { toast } = useToast();

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        '--primary': config.primaryColor || '#3b82f6',
        '--secondary': config.primaryColor || '#10b981',
        '--accent': config.accentColor || '#8b5cf6',
      } as React.CSSProperties}
    >
      {!hideNav && (
        <MainNavigation 
          isAuthenticated={!!user}
          user={user ? {
            ...user,
            organization_id: user.organizationId, // Convert organizationId to organization_id for compatibility
            username: user.username || user.email, // Ensure username is always defined
          } : null}
          notifications={notifications}
          onSignOut={async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              toast({
                title: 'Error',
                description: 'Failed to sign out',
                variant: 'destructive',
              });
            }
          }}
          onNotificationClick={async (id: string) => {
            try {
              await markAsRead(id);
            } catch (error) {
              console.error('Error marking notification as read:', error);
              toast({
                title: 'Error',
                description: 'Failed to mark notification as read',
                variant: 'destructive',
              });
            }
          }}
          onMarkAllAsRead={async () => {
            try {
              await markAllAsRead();
            } catch (error) {
              console.error('Error marking all notifications as read:', error);
              toast({
                title: 'Error',
                description: 'Failed to mark all notifications as read',
                variant: 'destructive',
              });
            }
          }}
        />
      )}
      <main className="flex-1">
        {children}
      </main>
      {!hideFooter && <BrandedFooter />}
    </div>
  );
};

export default MainLayout;
