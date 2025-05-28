import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

export default function Analytics() {
  const { user } = useAuth();
  
  // Check user permissions for analytics access
  const { data: userPermissions } = useQuery({
    queryKey: ['/api/user/permissions'],
    enabled: !!user,
  });

  const hasAnalyticsAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('ACCESS_ANALYTICS') || 
    userPermissions.includes('MANAGE_ORGANIZATION')
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Please sign in to access analytics dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasAnalyticsAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access analytics. Contact your administrator for access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <AnalyticsDashboard />;
}