import { Link, useLocation } from 'wouter';
import { Shield, Users, Building2, Activity, CreditCard, Settings, LogOut, BarChart3, Flag, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
  const [location] = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      window.location.href = '/login';
    } catch (error) {
      toast({
        title: 'Logout Failed',
        description: 'Could not log out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-screen w-64 bg-slate-900 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Superadmin</h1>
            <p className="text-sm text-slate-400">System Control</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {superadminNavItems.map((item) => {
          const isActive = location === item.path || (item.path !== '/superadmin' && location.startsWith(item.path));
          
          return (
            <Link key={item.id} href={item.path}>
              <a
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <Link href="/">
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900 transition-colors">
            <BarChart3 className="w-5 h-5" />
            Exit to App
          </a>
        </Link>
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );
}