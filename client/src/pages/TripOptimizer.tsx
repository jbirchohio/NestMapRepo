import CorporateTripOptimizer from "@/components/CorporateTripOptimizer";
import { useAuth } from "@/contexts/auth/NewAuthContext";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";
export default function TripOptimizer() {
    const { user } = useAuth();
    // Check user permissions for optimization access
    const { data: userPermissions } = useQuery({
        queryKey: ['/api/user/permissions', user?.id],
        queryFn: async () => {
            if (!user?.id)
                return [];
            const response = await fetch(`/api/user/permissions?userId=${user.id}`);
            if (!response.ok)
                throw new Error('Failed to fetch permissions');
            const data = await response.json();
            return data.permissions || [];
        },
        enabled: !!user,
    });
    const hasOptimizerAccess = userPermissions && (userPermissions.canViewAnalytics ||
        userPermissions.canManageOrganization ||
        userPermissions.canAccessAdmin ||
        user?.role === 'admin');
    if (!user) {
        return (<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4"/>
          <AlertDescription>
            Please sign in to access the trip optimizer.
          </AlertDescription>
        </Alert>
      </div>);
    }
    if (!hasOptimizerAccess) {
        return (<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4"/>
          <AlertDescription>
            You don't have permission to access the trip optimizer. Contact your administrator for access.
          </AlertDescription>
        </Alert>
      </div>);
    }
    return (<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        <CorporateTripOptimizer />
      </div>
    </div>);
}
