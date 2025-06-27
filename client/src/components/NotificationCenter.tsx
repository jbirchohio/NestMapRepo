import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Bell, Check, X, Users, Plane, Calendar, CreditCard, AlertTriangle, Info, CheckCircle } from 'lucide-react';
interface Notification {
    id: string;
    type: 'trip_shared' | 'trip_update' | 'booking_confirmed' | 'payment_due' | 'team_invite' | 'system' | 'reminder';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    actionUrl?: string;
    metadata?: unknown;
}
const notificationIcons = {
    trip_shared: Users,
    trip_update: Calendar,
    booking_confirmed: Plane,
    payment_due: CreditCard,
    team_invite: Users,
    system: Info,
    reminder: AlertTriangle,
};
const notificationColors = {
    trip_shared: 'text-blue-600',
    trip_update: 'text-green-600',
    booking_confirmed: 'text-electric-600',
    payment_due: 'text-red-600',
    team_invite: 'text-orange-600',
    system: 'text-slate-600',
    reminder: 'text-yellow-600',
};
export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    // Fetch notifications
    const { data: notifications = [], isLoading } = useQuery<Notification[]>({
        queryKey: ['/api/notifications'],
        refetchInterval: 30000, // Refetch every 30 seconds
    });
    // Mark notification as read
    const markAsReadMutation = useMutation({
        mutationFn: async (notificationId: string) => {
            return apiRequest('PUT', `/api/notifications/${notificationId}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        },
    });
    // Mark all as read
    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            return apiRequest('PUT', '/api/notifications/mark-all-read');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
            toast({
                title: "All notifications marked as read",
            });
        },
    });
    // Delete notification
    const deleteNotificationMutation = useMutation({
        mutationFn: async (notificationId: string) => {
            return apiRequest('DELETE', `/api/notifications/${notificationId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        },
    });
    const unreadCount = notifications.filter((n: Notification) => !n.read).length;
    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markAsReadMutation.mutate(notification.id);
        }
        if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
        }
    };
    const formatTimeAgo = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        if (diffInMinutes < 1)
            return 'Just now';
        if (diffInMinutes < 60)
            return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440)
            return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    };
    return (<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4"/>
          {unreadCount > 0 && (<Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center p-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (<Button variant="ghost" size="sm" onClick={() => markAllAsReadMutation.mutate()} disabled={markAllAsReadMutation.isPending} className="h-auto p-1 text-xs">
                  Mark all read
                </Button>)}
            </div>
            {unreadCount > 0 && (<CardDescription>
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </CardDescription>)}
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {isLoading ? (<div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"/>
                </div>) : notifications.length === 0 ? (<div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-12 w-12 text-slate-400 mb-4"/>
                  <p className="text-slate-600 dark:text-slate-400 mb-2">No notifications</p>
                  <p className="text-sm text-slate-500">You're all caught up!</p>
                </div>) : (<div className="divide-y">
                  {notifications.map((notification: Notification) => {
                const IconComponent = notificationIcons[notification.type] || Info;
                const iconColor = notificationColors[notification.type] || 'text-slate-600';
                return (<div key={notification.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`} onClick={() => handleNotificationClick(notification)}>
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 ${iconColor}`}>
                            <IconComponent className="h-5 w-5"/>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                {notification.title}
                              </p>
                              <div className="flex items-center gap-2 ml-2">
                                <span className="text-xs text-slate-500">
                                  {formatTimeAgo(notification.timestamp)}
                                </span>
                                {!notification.read && (<div className="w-2 h-2 bg-blue-600 rounded-full"/>)}
                              </div>
                            </div>
                            
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                              {notification.message}
                            </p>

                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">
                                {notification.type.replace('_', ' ')}
                              </Badge>
                              
                              <div className="flex items-center gap-1">
                                {!notification.read && (<Button variant="ghost" size="sm" onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notification.id);
                        }} className="h-6 w-6 p-0">
                                    <Check className="h-3 w-3"/>
                                  </Button>)}
                                
                                <Button variant="ghost" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        deleteNotificationMutation.mutate(notification.id);
                    }} className="h-6 w-6 p-0 text-red-600 hover:text-red-700">
                                  <X className="h-3 w-3"/>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>);
            })}
                </div>)}
            </ScrollArea>
          </CardContent>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>);
}
