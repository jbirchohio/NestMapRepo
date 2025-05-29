import BookingSystem from "@/components/BookingSystem";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

export default function Bookings() {
  const { user, userId } = useAuth();
  
  // Check user permissions for booking access
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

  const hasBookingAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('CREATE_TRIPS') || 
    userPermissions.includes('MANAGE_ORGANIZATION') ||
    userPermissions.includes('manage_organizations')
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Please sign in to access the booking system.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasBookingAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access the booking system. Contact your administrator for access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        <BookingSystem />
      </div>
    </div>
  );
}