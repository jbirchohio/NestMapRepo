import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { useAuth } from "@/contexts/JWTAuthContext";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

export default function Analytics() {
  const { user } = useAuth();

  // Check user permissions for analytics access
  const { data: userPermissions } = useQuery({
    queryKey: ['/api/user/permissions'],
    queryFn: async () => {
      const response = await fetch('/api/user/permissions', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      const data = await response.json();
      return data.permissions || [];
    },
    enabled: !!user,
  });

  // Debug permissions
  console.log('User permissions for analytics:', userPermissions);
  console.log('User object:', user);

  const hasAnalyticsAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('ACCESS_ANALYTICS') || 
    userPermissions.includes('view_analytics') ||
    userPermissions.includes('MANAGE_ORGANIZATION') ||
    userPermissions.includes('manage_organizations')
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-soft-100 dark:bg-navy-900 flex items-center justify-center p-4">
        <Alert className="max-w-md glass-card electric-glow animated-card">
          <Shield className="h-4 w-4 text-electric-500" />
          <AlertDescription className="text-navy-700 dark:text-navy-300">
            Please sign in to access analytics dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasAnalyticsAccess) {
    return (
      <div className="min-h-screen bg-soft-100 dark:bg-navy-900 flex items-center justify-center p-4">
        <Alert className="max-w-md glass-card electric-glow animated-card">
          <Shield className="h-4 w-4 text-electric-500" />
          <AlertDescription className="text-navy-700 dark:text-navy-300">
            You don't have permission to access analytics. Contact your administrator for access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800 p-4">
      <div className="max-w-7xl mx-auto">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}