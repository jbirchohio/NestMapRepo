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
import NotificationCenter from '@/components/NotificationCenter';
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
  const { user, userId, roleType, signOut, loading } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  // Get user permissions with proper auth state checks
  const { data: userPermissions } = useQuery({
    queryKey: ['/api/user/permissions', userId],
    queryFn: async () => {
      if (!userId || !user) return [];
      const response = await fetch(`/api/user/permissions?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch permissions');
      const data = await response.json();
      console.log('Permissions loaded:', data.permissions);
      return data.permissions || [];
    },
    enabled: !!userId && !!user && !loading,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Debug: Log current permissions status
  console.log('Current user permissions:', userPermissions);

  // Check permissions for different sections
  const hasAnalyticsAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('ACCESS_ANALYTICS') || 
    userPermissions.includes('view_analytics') || 
    userPermissions.includes('MANAGE_ORGANIZATION') ||
    userPermissions.includes('manage_organizations')
  );

  const hasBookingAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('CREATE_TRIPS') || 
    userPermissions.includes('MANAGE_ORGANIZATION') ||
    userPermissions.includes('manage_organizations')
  );

  const hasOptimizerAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('ACCESS_ANALYTICS') || 
    userPermissions.includes('view_analytics') ||
    userPermissions.includes('MANAGE_ORGANIZATION') ||
    userPermissions.includes('manage_organizations')
  );

  const hasAIGeneratorAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('CREATE_TRIPS') || 
    userPermissions.includes('MANAGE_ORGANIZATION') ||
    userPermissions.includes('manage_organizations') ||
    userPermissions.includes('ACCESS_ANALYTICS') ||
    userPermissions.includes('view_analytics')
  );

  const hasSettingsAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('MANAGE_ORGANIZATION') || 
    userPermissions.includes('manage_organizations') ||
    userPermissions.includes('ADMIN_ACCESS')
  );

  const hasTeamAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('INVITE_MEMBERS') || 
    userPermissions.includes('manage_users') ||
    userPermissions.includes('MANAGE_ORGANIZATION') ||
    userPermissions.includes('manage_organizations')
  );

  const hasBillingAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('BILLING_ACCESS') || 
    userPermissions.includes('MANAGE_ORGANIZATION') ||
    userPermissions.includes('manage_organizations')
  );

  if (!user) {
    return null; // Don't show navigation for unauthenticated users
  }

  // Check if this is a demo user
  const isDemo = (user as any).isDemo || user.email?.includes('demo') || user.email?.includes('@orbit') || user.email?.includes('@velocitytrips.com');
  
  // Role-based navigation items  
  const getRoleBasedDashboardPath = () => {
    return roleType === 'agency' ? '/dashboard/agency' : '/dashboard/corporate';
  };

  const navigationItems = [
    {
      path: getRoleBasedDashboardPath(),
      label: roleType === 'agency' ? 'Client Hub' : 'Travel Console',
      icon: Home,
      active: location === getRoleBasedDashboardPath() || location === '/',
      show: true
    },
    {
      path: '/analytics',
      label: roleType === 'agency' ? 'Client Analytics' : 'Travel Analytics',
      icon: BarChart3,
      active: location === '/analytics',
      show: hasAnalyticsAccess,
      badge: 'Pro'
    },
    {
      path: '/bookings',
      label: roleType === 'agency' ? 'Client Bookings' : 'Team Bookings',
      icon: Plane,
      active: location === '/bookings',
      show: hasBookingAccess,
      badge: 'New'
    },
    {
      path: '/ai-generator',
      label: roleType === 'agency' ? 'AI Proposal Generator' : 'AI Trip Generator',
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
      label: roleType === 'agency' ? 'Team & Clients' : 'Team Management',
      icon: Users,
      active: location === '/team',
      show: hasTeamAccess
    },
    {
      path: '/billing',
      label: roleType === 'agency' ? 'Commission & Billing' : 'Company Billing',
      icon: CreditCard,
      active: location === '/billing',
      show: hasBillingAccess
    },
    {
      path: '/settings',
      label: roleType === 'agency' ? 'Agency Settings' : 'Enterprise Settings',
      icon: Settings,
      active: location === '/settings',
      show: hasSettingsAccess,
      badge: (user.role === 'admin' || user.role === 'owner') ? 'Admin' : undefined
    }
  ];

  return (
    <nav className="border-b bg-white dark:bg-slate-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[4rem] py-2">
          {/* Logo/Brand Section */}
          <div className="flex items-center gap-4">
            <Link href={getRoleBasedDashboardPath()} className="flex items-center gap-2 flex-shrink-0">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl text-slate-900 dark:text-slate-100">
                  NestMap
                </span>
                <span className="text-xs text-muted-foreground -mt-1">
                  {roleType === 'agency' ? 'Client Travel Proposals' : 'Company Travel Management'}
                </span>
              </div>
            </Link>
          </div>

          {/* User Section */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <NotificationCenter />

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
                  
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link href="/profile?tab=security" className="flex items-center">
                      <Key className="mr-2 h-4 w-4" />
                      Change Password
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild>
                    <Link href="/help" className="flex items-center">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Help & Support
                    </Link>
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

        {/* Main Navigation - Full Width Row */}
        <div className="border-t border-slate-200 dark:border-slate-700 py-3">
          <div className="flex flex-wrap gap-2">
            {navigationItems.filter(item => item.show).map((item) => (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={item.active ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <Badge 
                      variant={item.badge === 'Admin' ? 'destructive' : item.active ? 'outline' : 'secondary'} 
                      className={`ml-1 text-xs ${
                        item.active ? 'border-white/20 text-white' : ''
                      }`}
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