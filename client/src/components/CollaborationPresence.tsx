import SharedItemDataType from '@/types/SharedItemDataType';
import SharedCollaboratorType from '@/types/SharedCollaboratorType';
import { useState, useEffect } from 'react';
import { useRealTimeCollaboration } from '@/hooks/useRealTimeCollaboration';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Eye, Edit3, MapPin, Wifi, WifiOff } from 'lucide-react';
interface CollaborationPresenceProps {
    tripId: number;
    organizationId?: number;
    userId: number;
    showCursors?: boolean;
    showActivityFeed?: boolean;
}
export default function CollaborationPresence({ tripId, organizationId, userId, showCursors = true, showActivityFeed = true }: CollaborationPresenceProps) {
    const { collaborators, isConnected, connectionError, updateCursor, updateSection, totalCollaborators } = useRealTimeCollaboration({ tripId, organizationId, userId });
    const [recentActivity, setRecentActivity] = useState<any /** FIXANYERROR: Replace 'any' */[]>([]);
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
    </div>);
}
// Component for showing section-specific collaboration
export function SectionCollaboration({ sectionId, children }: {
    sectionId: string;
    children: React.ReactNode;
}) {
    const { updateSection } = useRealTimeCollaboration({ tripId: 1, userId: 1 }); // These would be passed as props
    const handleFocus = () => {
        updateSection(sectionId);
    };
    const handleBlur = () => {
        updateSection('');
    };
    return (<div onFocus={handleFocus} onBlur={handleBlur} onMouseEnter={handleFocus} onMouseLeave={handleBlur} className="relative">
      {children}
    </div>);
}
// Hook for components to easily integrate collaboration
export function useCollaborationAwareness(sectionId: string) {
    const { sendActivity } = useRealTimeCollaboration({ tripId: 1, userId: 1 });
    const notifyEdit = (itemType: string, itemId: string) => {
        sendActivity('editing', { sectionId, itemType, itemId });
    };
    const notifyView = (itemType: string, itemId: string) => {
        sendActivity('viewing', { sectionId, itemType, itemId });
    };
    const notifyAdd = (itemType: string, itemData: SharedItemDataType) => {
        sendActivity('added', { sectionId, itemType, itemData });
    };
    const notifyDelete = (itemType: string, itemId: string) => {
        sendActivity('deleted', { sectionId, itemType, itemId });
    };
    return {
        notifyEdit,
        notifyView,
        notifyAdd,
        notifyDelete
    };
}
