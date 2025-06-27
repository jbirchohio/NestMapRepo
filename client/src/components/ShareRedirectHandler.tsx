import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import SharedTrip from '@/pages/SharedTrip';
import type { ClientTrip } from '@/shared/types/trip';
import type { ApiResponse } from '@/shared/types/api';
import { apiClient } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
export default function ShareRedirectHandler() {
    const { shareCode } = useParams<{
        shareCode: string;
    }>();
    const [location] = useLocation();
    // Extract permission from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const permission = urlParams.get('permission');
    // Fetch shared trip data with proper typing
    const { data: sharedTrip, isLoading } = useQuery<ApiResponse<ClientTrip>>({
        queryKey: ['shared-trip', shareCode],
        queryFn: async () => {
            if (!shareCode) throw new Error('Share code is required');
            const response = await apiClient.get(`/api/share/${shareCode}`);
            return response.data;
        },
        enabled: !!shareCode,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Handle edit redirect at the routing level, before component renders
    useEffect(() => {
        if (permission === 'edit' && sharedTrip?.data?.id) {
            console.log('Redirecting to edit mode for trip:', sharedTrip.data.id);
            // Use window.location.replace to prevent back button from coming back to this page
            window.location.replace(`/trip/${sharedTrip.data.id}`);
        }
    }, [permission, sharedTrip]);

    // Show loading state while fetching trip data
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <LoadingSpinner className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading shared trip...</p>
                </div>
            </div>
        );
    }

    // If it's an edit permission and we have trip data, show redirect message
    if (permission === 'edit' && sharedTrip?.data?.id) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <LoadingSpinner className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Redirecting to edit mode...</p>
                </div>
            </div>
        );
    }
    // For read-only or when loading, render the SharedTrip component
    return <SharedTrip />;
}
