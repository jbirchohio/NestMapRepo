import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Users, Building2, Activity, CreditCard, Settings, LogOut, BarChart3, Flag, Briefcase, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const superadminNavItems = [
  { id: 'overview', label: 'Overview', icon: BarChart3, path: '/superadmin' },
  { id: 'organizations', label: 'Organizations', icon: Building2, path: '/superadmin/organizations' },
  { id: 'users', label: 'Users', icon: Users, path: '/superadmin/users' },
  { id: 'activity', label: 'Activity Logs', icon: Activity, path: '/superadmin/activity' },
  { id: 'billing', label: 'Billing', icon: CreditCard, path: '/superadmin/billing' },
  { id: 'sessions', label: 'Sessions', icon: Shield, path: '/superadmin/sessions' },
  { id: 'flags', label: 'Feature Flags', icon: Flag, path: '/superadmin/flags' },
  { id: 'jobs', label: 'Background Jobs', icon: Briefcase, path: '/superadmin/jobs' },
  { id: 'settings', label: 'System Settings', icon: Settings, path: '/superadmin/settings' },
];

export function SuperadminNavigation() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      // The signOut function already handles redirect to home page
    } catch (error) {
      toast({
        title: 'Logout Failed',
        description: 'Could not log out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="sm"
          className="bg-navy-800/80 backdrop-blur-sm border-electric-700/30 text-white hover:bg-navy-700/80"
        >
          {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Mobile Overlay - Only show on mobile screens */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "h-screen w-64 bg-navy-800 dark:bg-navy-900 border-r border-electric-200/30 dark:border-electric-700/30 flex flex-col transition-transform duration-300",
        "lg:translate-x-0 lg:fixed lg:left-0 lg:top-0", // Fixed positioning on desktop
        isOpen ? "translate-x-0" : "-translate-x-full", // Mobile: slide in/out
        "fixed z-50 lg:z-10" // Fixed on mobile with high z-index, lower z-index on desktop
      )}>
        {/* Header */}
        <div className="p-6 border-b border-electric-200/30 dark:border-electric-700/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-electric-500 to-electric-600 rounded-lg flex items-center justify-center electric-glow">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent">Superadmin</h1>
              <p className="text-sm text-navy-400 dark:text-navy-300">System Control</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {superadminNavItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/superadmin' && pathname?.startsWith(item.path));
            
            return (
              <Link key={item.id} href={item.path}>
                <div
                  onClick={() => setIsOpen(false)} // Close mobile menu on navigation
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer morphing-button',
                    isActive
                      ? 'bg-gradient-to-r from-electric-500/20 to-electric-600/20 text-electric-400 border border-electric-500/30 electric-glow'
                      : 'text-navy-300 hover:text-white hover:bg-navy-700/50 dark:hover:bg-navy-800/50'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-electric-200/30 dark:border-electric-700/30 space-y-2">
          <Link href="/">
            <div 
              onClick={() => setIsOpen(false)}
              className={cn('flex items-center gap-3 px-3 py-2 rounded-md transition-colors', {
                'bg-electric-600 text-white': pathname === '/',
                'hover:bg-navy-700/60 text-gray-300 hover:text-white': pathname !== '/'
              })}
            >
              <BarChart3 className="w-5 h-5" />
              Exit to App
            </div>
          </Link>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-navy-300 hover:text-white hover:bg-navy-700/50 dark:hover:bg-navy-800/50"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );
}
