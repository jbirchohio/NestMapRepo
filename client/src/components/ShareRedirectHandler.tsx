import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import SharedTrip from "@/pages/SharedTrip";

export default function ShareRedirectHandler() {
  const { shareCode } = useParams<{ shareCode: string }>();

  // Extract permission from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const permission = urlParams.get('permission');

  // Fetch shared trip data
  const { data: sharedTrip } = useQuery({
    queryKey: [`/api/share/${shareCode}`],
    enabled: !!shareCode,
  });

  // Handle edit redirect at the routing level, before component renders
  useEffect(() => {
    if (permission === 'edit' && sharedTrip && (sharedTrip as any).id) {
      console.log('Redirecting to edit mode for trip:', (sharedTrip as any).id);
      window.location.replace(`/trip/${(sharedTrip as any).id}`);
    }
  }, [permission, sharedTrip]);

  // If it's an edit permission and we have trip data, don't render anything (redirect happening)
  if (permission === 'edit' && sharedTrip && (sharedTrip as any).id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-electric-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Redirecting to edit mode...</p>
        </div>
      </div>
    );
  }

  // For read-only or when loading, render the SharedTrip component
  return <SharedTrip />;
}
