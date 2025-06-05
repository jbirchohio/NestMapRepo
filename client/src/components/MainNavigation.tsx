import React, { useState } from 'react';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { RoleGate, useRolePermissions } from '@/hooks/useRolePermissions';
import NotificationCenter from '@/components/NotificationCenter';
import { PrimaryButton } from '@/components/ui/primary-button';
import { AnimatedCard } from '@/components/ui/animated-card';
import { motion } from 'framer-motion';
import { 
  Home, 
  BarChart3,
  Building2,
  Menu,
  X, 
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
  MapPin,
  Route,
  Edit3,
  Key,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Travel Console Menu Component
function TravelConsoleMenu({ location }: { location: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const travelRoutes = [
    '/trip-planner', 
    '/flights', 
    '/hotels', 
    '/optimizer', 
    '/ai-generator',
    '/sequential-booking'
  ];
  
  const isActive = travelRoutes.includes(location);
  
  return (
    <div className="relative">
      <Button
        variant={isActive ? 'default' : 'ghost'}
        size="sm"
        className="flex items-center gap-2 whitespace-nowrap"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Brain className="h-4 w-4" />
        <span className="text-sm font-medium">Travel Console</span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </Button>
      
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-2 z-[100] min-w-48"
        >
          <div className="space-y-1">
            <Link href="/trip-planner">
              <Button
                variant={location === '/trip-planner' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setIsExpanded(false)}
              >
                <MapPin className="h-4 w-4" />
                Plan Trip
              </Button>
            </Link>
            
            <Link href="/flights">
              <Button
                variant={location === '/flights' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setIsExpanded(false)}
              >
                <Plane className="h-4 w-4" />
                Book Flights
              </Button>
            </Link>
            
            <Link href="/ai-generator">
              <Button
                variant={location === '/ai-generator' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setIsExpanded(false)}
              >
                <Sparkles className="h-4 w-4" />
                AI Trip Generator
              </Button>
            </Link>
            
            <Link href="/optimizer">
              <Button
                variant={location === '/optimizer' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setIsExpanded(false)}
              >
                <Route className="h-4 w-4" />
                Trip Optimizer
              </Button>
            </Link>
            
            <Link href="/sequential-booking">
              <Button
                variant={location === '/sequential-booking' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setIsExpanded(false)}
              >
                <Plane className="h-4 w-4" />
                Sequential Flights
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function MainNavigation() {
  const { user, userId, roleType, signOut, loading } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get user permissions - since you're the JonasCo owner, return all permissions
  const { data: userPermissions } = useQuery({
    queryKey: ['/api/user/permissions'],
    queryFn: async () => {
      const response = await fetch('/api/user/permissions', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      const data = await response.json();
      console.log('Permissions loaded:', data.permissions);
      return data.permissions || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 3
  });

  // Extract permissions array from the response object
  const permissions = userPermissions?.permissions || [];
  
  // Check permissions for different sections
  const hasAnalyticsAccess = Array.isArray(permissions) && (
    permissions.includes('ACCESS_ANALYTICS') || 
    permissions.includes('view_analytics') || 
    permissions.includes('MANAGE_ORGANIZATION') ||
    permissions.includes('manage_organizations')
  );

  const hasBookingAccess = Array.isArray(permissions) && (
    permissions.includes('CREATE_TRIPS') || 
    permissions.includes('MANAGE_ORGANIZATION') ||
    permissions.includes('manage_organizations')
  );

  const hasOptimizerAccess = Array.isArray(permissions) && (
    permissions.includes('ACCESS_ANALYTICS') || 
    permissions.includes('view_analytics') ||
    permissions.includes('MANAGE_ORGANIZATION') ||
    permissions.includes('manage_organizations')
  );

  const hasAIGeneratorAccess = Array.isArray(permissions) && (
    permissions.includes('CREATE_TRIPS') || 
    permissions.includes('MANAGE_ORGANIZATION') ||
    permissions.includes('manage_organizations') ||
    permissions.includes('ACCESS_ANALYTICS') ||
    permissions.includes('view_analytics')
  );

  const hasSettingsAccess = Array.isArray(permissions) && (
    permissions.includes('MANAGE_ORGANIZATION') || 
    permissions.includes('manage_organizations') ||
    permissions.includes('ADMIN_ACCESS')
  );

  const hasTeamAccess = Array.isArray(permissions) && (
    permissions.includes('INVITE_MEMBERS') || 
    permissions.includes('manage_users') ||
    permissions.includes('MANAGE_ORGANIZATION') ||
    permissions.includes('manage_organizations')
  );

  const hasBillingAccess = Array.isArray(permissions) && (
    permissions.includes('BILLING_ACCESS') || 
    permissions.includes('MANAGE_ORGANIZATION') ||
    permissions.includes('manage_organizations')
  );

  const hasOrganizationAccess = Array.isArray(permissions) && (
    permissions.includes('MANAGE_ORGANIZATION') || 
    permissions.includes('manage_organizations') ||
    permissions.includes('ADMIN_ACCESS')
  );

  if (!user) {
    return null; // Don't show navigation for unauthenticated users
  }

  // Role-based navigation items
  const getRoleBasedDashboardPath = () => {
    if (roleType === 'agency') return '/dashboard/agency';
    return '/dashboard/corporate';
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
      path: '/trip-planner',
      label: 'Plan Trip',
      icon: MapPin,
      active: location === '/trip-planner',
      show: true
    },
    {
      path: '/flights',
      label: 'Book Flights',
      icon: Plane,
      active: location === '/flights',
      show: true
    },
    {
      path: '/sequential-booking',
      label: 'Sequential Flights',
      icon: Plane,
      active: location === '/sequential-booking',
      show: true
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
      path: '/corporate-cards',
      label: 'Corporate Cards',
      icon: CreditCard,
      active: location === '/corporate-cards',
      show: hasBillingAccess,
      badge: 'New'
    },
    {
      path: '/organization-funding',
      label: 'Organization Funding',
      icon: Shield,
      active: location === '/organization-funding',
      show: hasBillingAccess,
      badge: 'Setup'
    },
    {
      path: '/admin',
      label: 'Organization',
      icon: Building2,
      active: location === '/admin',
      show: hasOrganizationAccess,
      badge: 'Admin'
    },
    {
      path: '/settings',
      label: roleType === 'agency' ? 'Agency Settings' : 'Company Settings',
      icon: Settings,
      active: location === '/settings',
      show: hasSettingsAccess,
      badge: (user.role === 'admin' || user.role === 'owner') ? 'Admin' : undefined
    }
  ];

  return (
    <motion.nav 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-electric-200/20 bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl sticky top-0 z-40"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-electric-500/5 via-transparent to-electric-400/5" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[4rem] py-2">
          {/* Mobile hamburger menu */}
          <div className="flex items-center gap-4">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button variant="ghost" size="sm" className="md:hidden hover:bg-electric-50 dark:hover:bg-electric-900/20">
                    <Menu className="h-5 w-5 text-electric-600 dark:text-electric-400" />
                  </Button>
                </motion.div>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-white dark:bg-dark-800 border-electric-200/30 z-[100]">
                <SheetHeader>
                  <SheetTitle className="text-left text-electric-900 dark:text-electric-100">Navigation</SheetTitle>
                  <SheetDescription className="text-left text-electric-600 dark:text-electric-400">
                    {roleType === 'agency' ? 'Client Travel Management' : 'Company Travel Management'}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-2">
                  {/* Use navigationItems array for mobile menu */}
                  {navigationItems.filter(item => item.show).map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <motion.div key={item.path} whileHover={{ scale: 1.02, x: 4 }} whileTap={{ scale: 0.98 }}>
                        <Link href={item.path} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-electric-50 dark:hover:bg-electric-900/10 text-gray-700 dark:text-gray-300">
                          <IconComponent className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto text-xs bg-electric-100 text-electric-700">
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}




                </div>
              </SheetContent>
            </Sheet>

            {/* Logo/Brand Section */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href={getRoleBasedDashboardPath()} className="flex items-center gap-2 flex-shrink-0">
                <div className="h-8 w-8 bg-gradient-to-br from-electric-500 to-electric-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">N</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xl bg-gradient-to-r from-electric-600 to-electric-500 bg-clip-text text-transparent dark:from-electric-400 dark:to-electric-300">
                    NestMap
                  </span>
                  <span className="text-xs text-electric-600/70 dark:text-electric-400/70 -mt-1 hidden sm:block">
                    {roleType === 'agency' ? 'Client Travel Proposals' : 'Company Travel Management'}
                  </span>
                </div>
              </Link>
            </motion.div>
          </div>





          {/* User Section */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <NotificationCenter />

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-electric-50 dark:hover:bg-electric-900/20">
                      <UserCircle className="h-4 w-4 text-electric-600 dark:text-electric-400" />
                      <span className="ml-1 hidden sm:inline text-electric-900 dark:text-electric-100">
                        {user.email}
                      </span>
                    </Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-dark-800 border-electric-200/30 z-[60]">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-electric-900 dark:text-electric-100">{user.email}</p>
                      <p className="text-xs leading-none text-electric-600 dark:text-electric-400">
                        {user.role || 'User'} • ID: {user.id}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-electric-200/30" />
                  
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center text-electric-700 dark:text-electric-300 hover:bg-electric-50 dark:hover:bg-electric-900/20">
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center text-electric-700 dark:text-electric-300 hover:bg-electric-50 dark:hover:bg-electric-900/20">
                      <Settings className="mr-2 h-4 w-4" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link href="/profile?tab=security" className="flex items-center text-electric-700 dark:text-electric-300 hover:bg-electric-50 dark:hover:bg-electric-900/20">
                      <Key className="mr-2 h-4 w-4" />
                      Change Password
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-electric-200/30" />
                  
                  <DropdownMenuItem asChild>
                    <Link href="/help" className="flex items-center text-electric-700 dark:text-electric-300 hover:bg-electric-50 dark:hover:bg-electric-900/20">
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

        {/* Main Navigation - Full Width Row - Hidden on mobile */}
        <div className="hidden md:block border-t border-slate-200 dark:border-slate-700 py-3">
          <div className="flex flex-wrap gap-2">
            {/* Analytics - Admin/Manager access */}
            <RoleGate requiredPermissions={['canAccessAnalytics']}>
              <Link href="/analytics">
                <Button
                  variant={location === '/analytics' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-sm font-medium">Analytics</span>
                </Button>
              </Link>
            </RoleGate>

            {/* Corporate Cards - Billing access */}
            <RoleGate requiredPermissions={['canIssueCards', 'canViewTransactions']}>
              <Link href="/corporate">
                <Button
                  variant={location === '/corporate' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm font-medium">Corporate Cards</span>
                </Button>
              </Link>
            </RoleGate>

            {/* Team Management - Admin/Manager access */}
            <RoleGate requiredPermissions={['canManageTeam']}>
              <Link href="/team">
                <Button
                  variant={location === '/team' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">Team</span>
                </Button>
              </Link>
            </RoleGate>

            {/* Organization Management - Admin only */}
            <RoleGate requiredPermissions={['canManageOrganization']}>
              <Link href="/organization-settings">
                <Button
                  variant={location === '/organization-settings' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Organization</span>
                  <Badge variant="destructive" className="ml-1 text-xs">Admin</Badge>
                </Button>
              </Link>
            </RoleGate>



            {/* Always show basic navigation */}
            <Link href="/">
              <Button
                variant={location === '/' ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Home className="h-4 w-4" />
                <span className="text-sm font-medium">Dashboard</span>
              </Button>
            </Link>

            <Link href="/trips">
              <Button
                variant={location === '/trips' ? 'default' : 'ghost'}
                size="sm"
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Plane className="h-4 w-4" />
                <span className="text-sm font-medium">Trips</span>
              </Button>
            </Link>

            {/* Travel Console - Collapsible menu for trip planning tools */}
            <TravelConsoleMenu location={location} />
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="md:hidden absolute top-full left-0 right-0 bg-white/95 dark:bg-dark-800/95 backdrop-blur-md border-b border-electric-200/50 dark:border-electric-700/50 shadow-lg z-[70]"
        >
          <div className="container mx-auto px-4 py-4">
            <div className="space-y-2">
              {navigationItems.filter(item => item.show).map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant={item.active ? "default" : "ghost"}
                      className={`w-full justify-start gap-3 py-3 transition-all duration-200 ${
                        item.active 
                          ? 'bg-electric-500 hover:bg-electric-600 text-white shadow-lg shadow-electric-500/25' 
                          : 'hover:bg-electric-50 dark:hover:bg-electric-900/20 text-gray-700 dark:text-gray-300 hover:text-electric-600 dark:hover:text-electric-400'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <IconComponent className={`h-5 w-5 ${item.active ? 'text-white' : ''}`} />
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge 
                          variant="secondary" 
                          className={`ml-auto text-xs ${
                            item.active 
                              ? 'bg-white/20 text-white border-white/30' 
                              : 'bg-electric-100 text-electric-700 border-electric-200'
                          }`}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}