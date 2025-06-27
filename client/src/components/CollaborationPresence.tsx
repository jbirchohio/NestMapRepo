import type { SharedCollaboratorType } from '@shared/types/SharedCollaboratorType';
import type { CollaborationPresenceProps, RecentActivityItem } from '@shared/types/collaboration/CollaborationTypes';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ActivityData } from '@shared/types/activity/ActivityTypes';
import { ActivityAction } from '@shared/constants/ActivityActions.js';
import { useRealTimeCollaboration } from '@/hooks/useRealTimeCollaboration';
import { ACTIVITY_ACTIONS } from '@shared/constants/ActivityActions.js';
import { useAuth } from '@/contexts/auth/useAuth';

// Constants
const DEFAULT_USER_COLOR = '#000000';
const COLLABORATION_SECTION = 'collaboration_presence';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Eye, Edit3, MapPin, Wifi, WifiOff, Globe, FileText, Map, Calendar } from 'lucide-react';

// Helper function to get icon based on activity type
export function getActivityIcon(activityType?: string): JSX.Element {
  if (!activityType) return <Globe className="w-3 h-3" />;
  
  const type = activityType.toLowerCase();
  if (type.includes('trip') || type.includes('itinerary')) {
    return <Map className="w-3 h-3" />;
  } else if (type.includes('note') || type.includes('document')) {
    return <FileText className="w-3 h-3" />;
  } else if (type.includes('event') || type.includes('calendar')) {
    return <Calendar className="w-3 h-3" />;
  }
  return <Globe className="w-3 h-3" />;
}



export default function CollaborationPresence({ 
    tripId, 
    organizationId, 
    userId, 
    showCursors = true, 
    showActivityFeed = true 
}: CollaborationPresenceProps) {
    const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
    
    // Handle new activities from the real-time collaboration hook
    const handleNewActivity = useCallback((activity: RecentActivityItem) => {
        setRecentActivity(prev => [activity, ...prev].slice(0, 20)); // Keep last 20 activities
    }, []);
    
    const { 
        collaborators, 
        isConnected, 
        connectionError, 
        updateCursor, 
        updateSection, 
        totalCollaborators,
        sendActivity 
    } = useRealTimeCollaboration({ 
        tripId, 
        organizationId, 
        userId,
        onActivity: handleNewActivity
    });
    
    // Get current user from auth context
    const { user, isAuthenticated } = useAuth();

    // Track the current section and send initial activity when component mounts
    useEffect(() => {
        // Update the current section when the component mounts
        updateSection(COLLABORATION_SECTION);
        
        if (sendActivity && isAuthenticated && user) {
            const displayName = user.displayName || 
                             (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 
                             user.email?.split('@')[0] || 'Anonymous');
            
            // Only include properties that exist in ActivityData
            const activityData = {
                section: COLLABORATION_SECTION,
                username: String(displayName || 'Anonymous'), // Ensure username is a string
                userColor: user.avatar ? `#${user.avatar.slice(-6)}` : DEFAULT_USER_COLOR
                // Don't include email as it's not part of ActivityData
            };
            
            sendActivity(ACTIVITY_ACTIONS.PAGE_VIEW, activityData);
        }
        
        // Cleanup function to clear the section when unmounting
        return () => {
            updateSection('');
        };
    }, [sendActivity, updateSection]);

    // Update timeAgo for activities periodically
    useEffect(() => {
        const updateTimeAgo = () => {
            setRecentActivity(prev => 
                prev.map(activity => ({
                    ...activity,
                    timeAgo: formatTimeAgo(activity.timestamp)
                }))
            );
        };
        
        const interval = setInterval(updateTimeAgo, 60000); // Update every minute
        updateTimeAgo(); // Initial update
        
        return () => clearInterval(interval);
    }, []);
    
    // Format time ago string (e.g., "2m ago", "1h ago")
    const formatTimeAgo = (date: Date): string => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60,
            second: 1
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
            }
        }
        
        return 'just now';
    };

    // Track mouse movement for cursor sharing
    useEffect(() => {
        if (!showCursors || !isConnected)
            return;
        const handleMouseMove = (e: MouseEvent) => {
            updateCursor(e.clientX, e.clientY);
        };
        document.addEventListener('mousemove', handleMouseMove);
        return () => document.removeEventListener('mousemove', handleMouseMove);
    }, [showCursors, isConnected, updateCursor]);
    const getPresenceText = (collaborator: SharedCollaboratorType) => {
        const timeSince = Date.now() - new Date(collaborator.lastSeen).getTime();
        const minutesAgo = Math.floor(timeSince / 60000);
        if (minutesAgo < 1)
            return 'Active now';
        if (minutesAgo < 5)
            return `${minutesAgo}m ago`;
        return 'Recently active';
    };
    const getActivityIcon = (page: string) => {
        if (page.includes('activities'))
            return <Edit3 className="w-3 h-3"/>;
        if (page.includes('map'))
            return <MapPin className="w-3 h-3"/>;
        return <Eye className="w-3 h-3"/>;
    };
    return (<div className="fixed top-4 right-4 z-50 space-y-3">
      {/* Connection Status */}
      <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            {isConnected ? (<Wifi className="w-4 h-4 text-green-600"/>) : (<WifiOff className="w-4 h-4 text-red-600"/>)}
            <span className="text-sm font-medium">
              {isConnected ? 'Connected' : 'Reconnecting...'}
            </span>
            {connectionError && (<span className="text-xs text-red-600">({connectionError})</span>)}
          </div>
        </CardContent>
      </Card>

      {/* Active Collaborators */}
      {totalCollaborators > 0 && (<Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-blue-600"/>
              <span className="text-sm font-medium">
                {totalCollaborators} collaborating
              </span>
            </div>
            
            <div className="space-y-2">
              {collaborators.map((collaborator) => (<TooltipProvider key={collaborator.userId}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: collaborator.color }}>
                          {collaborator.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {collaborator.username}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            {getActivityIcon(collaborator.currentPage)}
                            <span className="truncate">
                              {collaborator.currentPage.split('/').pop() || 'viewing'}
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs" style={{
                    backgroundColor: `${collaborator.color}20`,
                    borderColor: collaborator.color
                }}>
                          {collaborator.isActive ? 'Live' : getPresenceText(collaborator)}
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <div className="text-sm">
                        <div className="font-medium">{collaborator.username}</div>
                        <div className="text-gray-600">
                          {collaborator.currentSection ?
                    `Editing: ${collaborator.currentSection}` :
                    `Viewing: ${collaborator.currentPage}`}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Last seen: {getPresenceText(collaborator)}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>))}
            </div>
          </CardContent>
        </Card>)}

      {/* Recent Activity Feed */}
      {showActivityFeed && recentActivity.length > 0 && (<Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm max-w-80">
          <CardContent className="p-3">
            <div className="text-sm font-medium mb-2">Recent Activity</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {recentActivity.slice(0, 5).map((activity, index) => (<div key={index} className="text-xs text-gray-600 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: activity.userColor }}/>
                  <span className="truncate">
                    <strong>{activity.username}</strong> {activity.action}
                  </span>
                  <span className="text-gray-400 flex-shrink-0">
                    {activity.timeAgo}
                  </span>
                </div>))}
            </div>
          </CardContent>
        </Card>)}

      {/* Live Cursors */}
      {showCursors && collaborators.map((collaborator) => collaborator.cursor && (<div key={`cursor-${collaborator.userId}`} className="fixed pointer-events-none z-50 transition-all duration-100" style={{
                left: collaborator.cursor.x,
                top: collaborator.cursor.y,
                transform: 'translate(-2px, -2px)'
            }}>
            <div className="relative">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="drop-shadow-sm">
                <path d="M3 3L17 9L9 11L7 17L3 3Z" fill={collaborator.color} stroke="white" strokeWidth="1"/>
              </svg>
              <div className="absolute top-5 left-2 text-xs font-medium text-white px-2 py-1 rounded-md shadow-sm whitespace-nowrap" style={{ backgroundColor: collaborator.color }}>
                {collaborator.username}
              </div>
            </div>
          </div>))}
    </div>
  );
}

// Component for showing section-specific collaboration
export function SectionCollaboration({ 
    sectionId, 
    children,
    updateSection,
    sendActivity
}: {
    sectionId: string;
    children: React.ReactNode;
    updateSection: (sectionId: string) => void;
    sendActivity?: (action: ActivityAction, data: Omit<Partial<ActivityData>, 'id' | 'action' | 'timestamp' | 'timeAgo'>) => void;
}) {
    const handleFocus = () => {
        updateSection(sectionId);
        if (sendActivity) {
            sendActivity('section_focus', { sectionId });
        }
    };
    
    const handleBlur = () => {
        updateSection('');
        if (sendActivity) {
            sendActivity('section_blur', { sectionId });
        }
    };
    
    return (
        <div 
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseEnter={handleFocus}
            onMouseLeave={handleBlur}
            className="relative"
        >
            {children}
        </div>
    );
}

// Hook for components to easily integrate collaboration
interface UseCollaborationAwarenessProps {
    sectionId: string;
    tripId: string;
    organizationId?: string;
    userId: number;
}

// Create a type for the activity data that can be passed to sendActivity
type SendActivityData = Omit<Partial<ActivityData>, 'id' | 'action' | 'timestamp' | 'timeAgo'>;

export function useCollaborationAwareness({ 
    sectionId, 
    tripId, 
    organizationId, 
    userId 
}: UseCollaborationAwarenessProps) {
    // Ensure organizationId is always a string, even if undefined
    const safeOrganizationId = organizationId ?? 'default-org';
    
    const { sendActivity } = useRealTimeCollaboration({ 
        tripId: tripId.toString(), 
        organizationId: safeOrganizationId, 
        userId: userId || 0, // Provide a default user ID if undefined
        onActivity: () => {}
    });
    
    // Create a base activity data object with common properties
    const getBaseActivityData = useCallback((): SendActivityData => ({
        section: sectionId,
        username: 'User', // This should be replaced with the actual username
        userColor: '#000000',
    }), [sectionId]);
    
    const notifyEdit = useCallback((itemType: string, itemId: string) => {
        sendActivity?.('editing', {
            ...getBaseActivityData(),
            // Add any additional properties specific to edit actions
        });
    }, [sendActivity, getBaseActivityData]);
    
    const notifyView = useCallback((itemType: string, itemId: string) => {
        sendActivity?.('viewing', {
            ...getBaseActivityData(),
            // Add any additional properties specific to view actions
        });
    }, [sendActivity, getBaseActivityData]);
    
    const notifyAdd = useCallback((itemType: string, itemData: Record<string, unknown>) => {
        sendActivity?.('added', {
            ...getBaseActivityData(),
            // Add any additional properties specific to add actions
        });
    }, [sendActivity, getBaseActivityData]);
    
    const notifyDelete = useCallback((itemType: string, itemId: string) => {
        sendActivity?.('deleted', {
            ...getBaseActivityData(),
            // Add any additional properties specific to delete actions
        });
    }, [sendActivity, getBaseActivityData]);
    
    return useMemo(() => ({
        notifyEdit,
        notifyView,
        notifyAdd,
        notifyDelete
    }), [notifyEdit, notifyView, notifyAdd, notifyDelete]);
}
