import WhiteLabelSettings from "@/components/WhiteLabelSettings";
import { useAuth } from "@/contexts/JWTAuthContext";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

export default function Settings() {
  const { user, userId } = useAuth();
  
  // Check user permissions for settings access
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

  const hasSettingsAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('MANAGE_ORGANIZATION') || 
    userPermissions.includes('manage_organizations') ||
    userPermissions.includes('ADMIN_ACCESS')
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-soft-100 dark:bg-navy-900 flex items-center justify-center p-4">
        <Alert className="max-w-md bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm border border-electric-300/20">
          <Shield className="h-4 w-4 text-electric-500" />
          <AlertDescription className="text-navy-900 dark:text-white">
            Please sign in to access organization settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasSettingsAccess) {
    return (
      <div className="min-h-screen bg-soft-100 dark:bg-navy-900 flex items-center justify-center p-4">
        <Alert className="max-w-md bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm border border-electric-300/20">
          <Shield className="h-4 w-4 text-electric-500" />
          <AlertDescription className="text-navy-900 dark:text-white">
            You don't have permission to access organization settings. Contact your administrator for access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-100 dark:bg-navy-900 p-4">
      <div className="max-w-7xl mx-auto">
        <WhiteLabelSettings />
      </div>
    </div>
  );
}