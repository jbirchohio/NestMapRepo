import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/JWTAuthContext';
import { useToast } from '@/hooks/use-toast';
import NewTripModalConsumer from '@/components/NewTripModalConsumer';
import AuthModalSimple from '@/components/auth/AuthModalSimple';
import {
  User,
  LogOut,
  HelpCircle,
  Plus,
  Home,
  ShoppingBag,
  LayoutDashboard,
  Shield,
  MapPin
} from 'lucide-react';

export default function MainNavigationConsumer() {
  const [location, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showNewTripModal, setShowNewTripModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check admin status when user changes
    if (user) {
      checkAdminStatus();
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/admin/check', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      }
    } catch (error) {
      setIsAdmin(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setLocation('/');
      toast({
        title: "Logged out successfully",
        description: "See you next time!",
      });
    } catch (error) {
      toast({
        title: "Error logging out",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const navigation = [
    { name: 'My Trips', href: '/', icon: Home, showWhenLoggedOut: false },
    { name: 'Destinations', href: '/destinations', icon: MapPin, showWhenLoggedOut: true },
    { name: 'Marketplace', href: '/marketplace', icon: ShoppingBag, showWhenLoggedOut: true },
    { name: 'Creator Hub', href: '/creator/dashboard', icon: LayoutDashboard, showWhenLoggedOut: false },
  ];

  // Filter navigation based on auth state
  const visibleNavigation = navigation.filter(item =>
    user || item.showWhenLoggedOut
  );

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4 sm:space-x-8">
              <Link href="/">
                <a className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Remvana
                </a>
              </Link>

              {/* Navigation - responsive, no hamburger */}
              <div className="hidden sm:flex items-center space-x-1 sm:space-x-4">
                {visibleNavigation.map((item) => (
                  <Link key={item.name} href={item.href}>
                    <a className={`inline-flex items-center px-2 sm:px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location === item.href
                        ? 'text-purple-600 bg-purple-50'
                        : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50'
                    }`}>
                      <item.icon className="h-4 w-4 mr-1.5 sm:mr-2" />
                      <span className="hidden md:inline">{item.name}</span>
                      <span className="md:hidden">
                        {item.name === 'Marketplace' ? 'Shop' :
                         item.name === 'Creator Hub' ? 'Create' :
                         item.name === 'Destinations' ? 'Places' :
                         'Trips'}
                      </span>
                    </a>
                  </Link>
                ))}
              </div>
            </div>

            {/* Right side - Auth buttons or User menu */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {user ? (
                <>
                  {/* New Trip button - hidden on mobile */}
                  <Button
                    size="sm"
                    onClick={() => setShowNewTripModal(true)}
                    className="hidden sm:flex bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    New Trip
                  </Button>

                  {/* User menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <User className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{user.username || user.email}</span>
                          <span className="text-xs text-gray-500">{user.email}</span>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {/* Mobile-only: New Trip option */}
                      <DropdownMenuItem
                        className="sm:hidden"
                        onClick={() => setShowNewTripModal(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Trip
                      </DropdownMenuItem>

                      {/* Mobile-only: Navigation items */}
                      <div className="sm:hidden">
                        {navigation.map((item) => (
                          <Link key={`mobile-${item.name}`} href={item.href}>
                            <DropdownMenuItem>
                              <item.icon className="h-4 w-4 mr-2" />
                              {item.name}
                            </DropdownMenuItem>
                          </Link>
                        ))}
                        <DropdownMenuSeparator />
                      </div>

                      <Link href="/profile">
                        <DropdownMenuItem>
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/help">
                        <DropdownMenuItem>
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Help
                        </DropdownMenuItem>
                      </Link>
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <Link href="/admin">
                            <DropdownMenuItem>
                              <Shield className="h-4 w-4 mr-2" />
                              Admin Dashboard
                            </DropdownMenuItem>
                          </Link>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                        <LogOut className="h-4 w-4 mr-2" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  {/* Mobile: Show Marketplace link */}
                  <Link href="/marketplace" className="sm:hidden">
                    <Button variant="ghost" size="sm">
                      <ShoppingBag className="h-4 w-4" />
                    </Button>
                  </Link>

                  {/* Auth buttons */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAuthView('login');
                      setShowAuthModal(true);
                    }}
                  >
                    Log in
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white"
                    onClick={() => {
                      setAuthView('signup');
                      setShowAuthModal(true);
                    }}
                  >
                    <span className="hidden sm:inline">Sign up</span>
                    <span className="sm:hidden">Join</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* New Trip Modal */}
      {showNewTripModal && (
        <NewTripModalConsumer
          isOpen={showNewTripModal}
          onClose={() => setShowNewTripModal(false)}
          onTripCreated={(trip) => {
            setShowNewTripModal(false);

            // Make sure we have a valid ID before navigating
            if (trip && trip.id) {
              setLocation(`/trip/${trip.id}`);
            } else {
              }
          }}
        />
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModalSimple
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialView={authView}
          redirectPath="/"
        />
      )}
    </>
  );
}