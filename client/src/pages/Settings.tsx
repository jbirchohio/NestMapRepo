import WhiteLabelSettings from "@/components/WhiteLabelSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

export default function Settings() {
  const { user, userId } = useAuth();
  
  // Check user permissions for settings access
  const { data: userPermissions } = useQuery({
    queryKey: ['/api/user/permissions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch(`/api/user/permissions?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch permissions');
      const data = await response.json();
      return data.permissions || [];
    },
    enabled: !!userId,
  });

  const hasSettingsAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('MANAGE_ORGANIZATION') || 
    userPermissions.includes('manage_organizations') ||
    userPermissions.includes('ADMIN_ACCESS')
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Please sign in to access organization settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasSettingsAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access organization settings. Contact your administrator for access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        <WhiteLabelSettings />
      </div>
    </div>
  );
}