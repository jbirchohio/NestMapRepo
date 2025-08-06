import React, { useState } from 'react';
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
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/JWTAuthContext';
import { useToast } from '@/hooks/use-toast';
import NewTripModalConsumer from '@/components/NewTripModalConsumer';
import { 
  Menu,
  X, 
  Plane, 
  MapPin,
  User,
  LogOut,
  HelpCircle,
  Plus,
  Home,
  Calendar
} from 'lucide-react';

export default function MainNavigationConsumer() {
  const [location, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNewTripModal, setShowNewTripModal] = useState(false);

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
    { name: 'My Trips', href: '/', icon: Home },
  ];

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and main nav */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/">
                  <a className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Remvana
                  </a>
                </Link>
              </div>
              
              {/* Desktop navigation - only show when logged in */}
              {user && (
                <div className="hidden md:ml-8 md:flex md:space-x-6">
                  {navigation.map((item) => (
                    <Link key={item.name} href={item.href}>
                      <a className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                        location === item.href
                          ? 'text-purple-600 border-b-2 border-purple-600'
                          : 'text-gray-700 hover:text-purple-600'
                      }`}>
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.name}
                      </a>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* User menu */}
              {user ? (
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Log in
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white">
                      Sign up
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px]">
                  <div className="flex flex-col space-y-4 mt-8">
                    {user ? (
                      <>
                        {navigation.map((item) => (
                          <Link key={item.name} href={item.href}>
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <item.icon className="h-4 w-4 mr-2" />
                              {item.name}
                            </Button>
                          </Link>
                        ))}
                        
                        <div className="pt-4 mt-4 border-t">
                          <Link href="/profile">
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <User className="h-4 w-4 mr-2" />
                              Profile
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-red-600"
                            onClick={() => {
                              handleLogout();
                              setMobileMenuOpen(false);
                            }}
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Log out
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Link href="/login">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Log in
                          </Button>
                        </Link>
                        <Link href="/signup">
                          <Button
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Sign up
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* New Trip Modal */}
      {showNewTripModal && (
        <NewTripModalConsumer
          onClose={() => setShowNewTripModal(false)}
          onTripCreated={(tripId) => {
            setShowNewTripModal(false);
            setLocation(`/trip/${tripId}`);
          }}
        />
      )}
    </>
  );
}