import React from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Home, 
  BarChart3, 
  Plane, 
  Brain, 
  Settings, 
  Users, 
  CreditCard,
  Shield,
  Bell,
  User,
  LogOut,
  Sparkles,
  UserCircle,
  Edit3,
  Key,
  HelpCircle
} from 'lucide-react';

export default function MainNavigation() {
  const { user, signOut } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  // Get user permissions
  const { data: userPermissions } = useQuery({
    queryKey: ['/api/user/permissions'],
    enabled: !!user,
  });

  // Check permissions for different sections
  const hasAnalyticsAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('ACCESS_ANALYTICS') || 
    userPermissions.includes('MANAGE_ORGANIZATION')
  );

  const hasBookingAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('CREATE_TRIPS') || 
    userPermissions.includes('MANAGE_ORGANIZATION')
  );

  const hasOptimizerAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('ACCESS_ANALYTICS') || 
    userPermissions.includes('MANAGE_ORGANIZATION')
  );

  const hasAIGeneratorAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('CREATE_TRIPS') || 
    userPermissions.includes('MANAGE_ORGANIZATION') ||
    userPermissions.includes('ACCESS_ANALYTICS')
  );

  const hasSettingsAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('MANAGE_ORGANIZATION') || 
    userPermissions.includes('ADMIN_ACCESS')
  );

  const hasTeamAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('INVITE_MEMBERS') || 
    userPermissions.includes('MANAGE_ORGANIZATION')
  );

  const hasBillingAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('BILLING_ACCESS') || 
    userPermissions.includes('MANAGE_ORGANIZATION')
  );

  if (!user) {
    return null; // Don't show navigation for unauthenticated users
  }

  const navigationItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: Home,
      active: location === '/',
      show: true
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: BarChart3,
      active: location === '/analytics',
      show: hasAnalyticsAccess,
      badge: 'Pro'
    },
    {
      path: '/bookings',
      label: 'Bookings',
      icon: Plane,
      active: location === '/bookings',
      show: hasBookingAccess,
      badge: 'New'
    },
    {
      path: '/ai-generator',
      label: 'AI Trip Generator',
      icon: Sparkles,
      active: location === '/ai-generator',
      show: hasAIGeneratorAccess,
      badge: 'AI'
    },
    {
      path: '/optimizer',
      label: 'Trip Optimizer',
      icon: Brain,
      active: location === '/optimizer',
      show: hasOptimizerAccess,
      badge: 'Pro'
    },
    {
      path: '/team',
      label: 'Team',
      icon: Users,
      active: location === '/team',
      show: hasTeamAccess
    },
    {
      path: '/billing',
      label: 'Billing',
      icon: CreditCard,
      active: location === '/billing',
      show: hasBillingAccess
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: Settings,
      active: location === '/settings',
      show: hasSettingsAccess,
      badge: 'Admin'
    }
  ];

  return (
    <nav className="border-b bg-white dark:bg-slate-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand Section */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="font-bold text-xl text-slate-900 dark:text-slate-100">
                NestMap
              </span>
            </Link>

            {/* Main Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navigationItems.filter(item => item.show).map((item) => (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={item.active ? 'default' : 'ghost'}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <Badge 
                        variant={item.badge === 'Admin' ? 'destructive' : 'secondary'} 
                        className="ml-1 text-xs"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* User Section */}
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                toast({
                  title: "Notifications",
                  description: "No new notifications",
                });
              }}
            >
              <Bell className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <Badge 
                variant="outline"
                className="text-xs"
              >
                {user.role || 'User'}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">
                      {user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.email}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.role || 'User'} • ID: {user.id}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem
                    onClick={() => {
                      toast({
                        title: "Profile Settings",
                        description: "Profile management coming soon",
                      });
                    }}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Profile
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => {
                      toast({
                        title: "Account Settings",
                        description: "Account management coming soon",
                      });
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => {
                      toast({
                        title: "Change Password",
                        description: "Password management coming soon",
                      });
                    }}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Change Password
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem
                    onClick={() => {
                      toast({
                        title: "Help & Support",
                        description: "Support documentation coming soon",
                      });
                    }}
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help & Support
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem
                    onClick={() => {
                      signOut();
                      toast({
                        title: "Logged out",
                        description: "You have been successfully logged out",
                      });
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3">
          <div className="flex gap-1 overflow-x-auto">
            {navigationItems.filter(item => item.show).map((item) => (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={item.active ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <item.icon className="h-4 w-4" />
                  <span className="text-xs">{item.label}</span>
                  {item.badge && (
                    <Badge 
                      variant={item.badge === 'Admin' ? 'destructive' : 'secondary'} 
                      className="ml-1 text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}