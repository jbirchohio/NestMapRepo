import React from 'react';
import { useWhiteLabel } from '@/contexts/WhiteLabelContext';
import { useAuth } from '@/providers/AuthProvider';
// User type from next-auth is not needed as we're using our own AuthUser type
import { useNotifications } from '@/hooks/useNotifications';
import MainNavigation from '@/components/MainNavigation';
import BrandedFooter from '@/components/BrandedFooter';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useNavigate } from 'react-router-dom';

// Import the User type from navigation types
import type { User as NavigationUser } from '@/components/navigation/types';

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
  const { user: authUser, signOut, isAuthenticated } = useAuth();
  
  // Transform the user object to match the expected type for navigation components
  const user: NavigationUser | null = authUser ? {
    id: authUser.id,
    email: authUser.email,
    role: authUser.role,
    organization_id: authUser.organizationId || null,
    username: authUser.name || authUser.email.split('@')[0] || '',
    avatarUrl: (authUser as any).image || null,
    name: authUser.name || '',
    firstName: authUser.name ? authUser.name.split(' ')[0] : null,
    lastName: authUser.name ? authUser.name.split(' ').slice(1).join(' ') || null : null,
    permissions: [],  // Add empty permissions array if not provided by NextAuth
  } : null;
  const { notifications = [], markAsRead, markAllAsRead } = useNotifications();
  const { toast } = useToast();
  const navigate = useNavigate();

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        '--primary': config.primaryColor || '#3b82f6',
        '--secondary': config.primaryColor || '#10b981',
        '--accent': config.accentColor || '#8b5cf6',
      } as React.CSSProperties}
    >
      <Toaster />
      {!hideNav && (
        <MainNavigation 
          isAuthenticated={isAuthenticated}
          user={user}
          notifications={notifications}
          onSignOut={async () => {
            try {
              await signOut({ callbackUrl: '/login' });
              navigate('/login');
            } catch (error) {
              console.error('Error signing out:', error);
              toast({
                title: 'Error',
                description: 'Failed to sign out. Please try again.',
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
          onSignIn={() => {
            navigate('/login');
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
