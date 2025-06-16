import React from 'react';
import { useWhiteLabel } from '@/contexts/WhiteLabelContext';
import { useAuth } from '@/contexts/auth/AuthContext';
import MainNavigation from '@/components/MainNavigation';
import BrandedFooter from '@/components/BrandedFooter';

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
          user={user}
          onLogout={signOut}
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
