import React from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWhiteLabel } from '@/contexts/WhiteLabelContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  Settings, 
  LogOut, 
  Menu,
  Bell,
  HelpCircle
} from 'lucide-react';

export default function BrandedHeader() {
  const { config } = useWhiteLabel();
  const { user, logout } = useAuth();
  const [location] = useLocation();

  return (
    <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Section */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              {config.companyLogo ? (
                <img 
                  src={config.companyLogo} 
                  alt={config.companyName}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <div 
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: config.primaryColor }}
                >
                  {config.companyName.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {config.companyName}
                </h1>
                {config.tagline && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">
                    {config.tagline}
                  </p>
                )}
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/">
              <Button 
                variant={location === '/' ? 'default' : 'ghost'}
                size="sm"
                style={location === '/' ? { backgroundColor: config.primaryColor } : {}}
              >
                Dashboard
              </Button>
            </Link>
            <Link href="/analytics">
              <Button 
                variant={location === '/analytics' ? 'default' : 'ghost'}
                size="sm"
                style={location === '/analytics' ? { backgroundColor: config.primaryColor } : {}}
              >
                Analytics
              </Button>
            </Link>
            <Link href="/teams">
              <Button 
                variant={location === '/teams' ? 'default' : 'ghost'}
                size="sm"
                style={location === '/teams' ? { backgroundColor: config.primaryColor } : {}}
              >
                Teams
              </Button>
            </Link>
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {config.helpUrl && (
              <Button variant="ghost" size="sm" asChild>
                <a href={config.helpUrl} target="_blank" rel="noopener noreferrer">
                  <HelpCircle className="h-4 w-4" />
                </a>
              </Button>
            )}
            
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>

            {user ? (
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline"
                  style={{ 
                    borderColor: config.accentColor, 
                    color: config.accentColor 
                  }}
                >
                  {user.role || 'User'}
                </Badge>
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">
                    {user.display_name || user.username}
                  </span>
                </Button>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {config.enablePublicSignup && (
                  <Button variant="outline" size="sm">
                    Sign Up
                  </Button>
                )}
                <Button 
                  size="sm"
                  style={{ backgroundColor: config.primaryColor }}
                >
                  Sign In
                </Button>
              </div>
            )}

            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}