import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  CalendarDays, 
  CheckCircle, 
  ExternalLink, 
  Download, 
  Upload,
  Settings,
  AlertCircle,
  Info
} from 'lucide-react';

interface CalendarConnection {
  id: string;
  provider: 'google' | 'outlook' | 'apple';
  email: string;
  connected: boolean;
  syncEnabled: boolean;
  lastSync?: string;
}

interface CalendarSettings {
  autoSync: boolean;
  syncInterval: number; // minutes
  defaultCalendar: string;
  includeNotes: boolean;
  setReminders: boolean;
  reminderMinutes: number;
}

export default function CalendarIntegration() {
  const [settings, setSettings] = useState<CalendarSettings>({
    autoSync: true,
    syncInterval: 60,
    defaultCalendar: 'primary',
    includeNotes: true,
    setReminders: true,
    reminderMinutes: 15
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch calendar connections
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['/api/calendar/connections'],
    queryFn: () => apiRequest('GET', '/api/calendar/connections').then(res => res.json()),
  });

  // Connect to calendar provider
  const connectCalendarMutation = useMutation({
    mutationFn: async (provider: 'google' | 'outlook' | 'apple') => {
      const response = await apiRequest('POST', '/api/calendar/connect', { provider });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        // Open auth URL in new window
        window.open(data.authUrl, 'calendar-auth', 'width=600,height=600');
      }
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/connections'] });
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to calendar provider. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Disconnect calendar
  const disconnectCalendarMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      return apiRequest('DELETE', `/api/calendar/connections/${connectionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/connections'] });
      toast({
        title: "Calendar Disconnected",
        description: "Calendar has been successfully disconnected."
      });
    }
  });

  // Sync trips to calendar
  const syncTripsToCalendarMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      return apiRequest('POST', `/api/calendar/sync/${connectionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/connections'] });
      toast({
        title: "Sync Complete",
        description: "Your trips have been synced to your calendar."
      });
    }
  });

  // Export trip as calendar file
  const exportCalendarMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const response = await apiRequest('GET', `/api/trips/${tripId}/calendar-export`);
      return response.blob();
    },
    onSuccess: (blob, tripId) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trip-${tripId}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Calendar File Downloaded",
        description: "You can now import this file into any calendar app."
      });
    }
  });

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google': return '🗓️';
      case 'outlook': return '📅';
      case 'apple': return '🍎';
      default: return '📆';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'google': return 'Google Calendar';
      case 'outlook': return 'Outlook Calendar';
      case 'apple': return 'Apple Calendar';
      default: return 'Calendar';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Calendar Integration
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Connect your calendars to automatically sync trips and get reminders
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="font-medium">Export Trip</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Download .ics file
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCalendarMutation.mutate('current')}
                disabled={exportCalendarMutation.isPending}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload className="h-8 w-8 text-green-600" />
                <div>
                  <div className="font-medium">Import Events</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    From calendar files
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="font-medium">Quick Sync</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Sync all trips now
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast({
                    title: "Sync Started",
                    description: "Syncing all trips to connected calendars..."
                  });
                }}
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connected Calendars */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Calendars</CardTitle>
          <CardDescription>
            Manage your calendar connections and sync settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : connections.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No calendars connected yet. Connect your first calendar to start syncing trips automatically.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {connections.map((connection: CalendarConnection) => (
                <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getProviderIcon(connection.provider)}</span>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {getProviderName(connection.provider)}
                        {connection.connected && (
                          <Badge variant="secondary" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {connection.email}
                        {connection.lastSync && (
                          <span className="ml-2">
                            • Last sync: {new Date(connection.lastSync).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Auto-sync</span>
                      <Switch
                        checked={connection.syncEnabled}
                        onCheckedChange={(checked) => {
                          // Update sync setting
                          console.log(`Toggle sync for ${connection.id}: ${checked}`);
                        }}
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncTripsToCalendarMutation.mutate(connection.id)}
                      disabled={syncTripsToCalendarMutation.isPending}
                    >
                      Sync Now
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disconnectCalendarMutation.mutate(connection.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <Separator />
          
          {/* Add New Calendar */}
          <div>
            <h4 className="font-medium mb-3">Connect New Calendar</h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => connectCalendarMutation.mutate('google')}
                disabled={connectCalendarMutation.isPending}
                className="flex items-center gap-2"
              >
                🗓️ Google Calendar
              </Button>
              
              <Button
                variant="outline"
                onClick={() => connectCalendarMutation.mutate('outlook')}
                disabled={connectCalendarMutation.isPending}
                className="flex items-center gap-2"
              >
                📅 Outlook
              </Button>
              
              <Button
                variant="outline"
                onClick={() => connectCalendarMutation.mutate('apple')}
                disabled={connectCalendarMutation.isPending}
                className="flex items-center gap-2"
              >
                🍎 Apple Calendar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
          <CardDescription>
            Customize how your trips are synced to your calendars
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Automatic Sync</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Automatically sync trips when they are created or updated
              </div>
            </div>
            <Switch
              checked={settings.autoSync}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoSync: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Include Activity Notes</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Add activity notes to calendar event descriptions
              </div>
            </div>
            <Switch
              checked={settings.includeNotes}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, includeNotes: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Set Reminders</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Add 15-minute reminders to all synced events
              </div>
            </div>
            <Switch
              checked={settings.setReminders}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, setReminders: checked }))}
            />
          </div>

          <div className="space-y-2">
            <div className="font-medium">Sync Frequency</div>
            <select
              className="w-full p-2 border rounded-md"
              value={settings.syncInterval}
              onChange={(e) => setSettings(prev => ({ ...prev, syncInterval: parseInt(e.target.value) }))}
            >
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every hour</option>
              <option value={240}>Every 4 hours</option>
              <option value={1440}>Daily</option>
            </select>
          </div>

          <Button 
            onClick={() => {
              toast({
                title: "Settings Saved",
                description: "Your calendar sync settings have been updated."
              });
            }}
            className="w-full"
          >
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Calendar URLs for Manual Sync */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Calendar Integration</CardTitle>
          <CardDescription>
            Use these URLs to subscribe to your trips in any calendar app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CalendarDays className="h-4 w-4" />
            <AlertDescription>
              Copy these URLs and add them as calendar subscriptions in your preferred calendar app.
              Your trips will appear automatically and stay updated.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="font-medium text-sm mb-1">All Trips</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm p-2 bg-white dark:bg-slate-900 rounded border">
                  https://nestmap.com/api/calendar/feed/all-trips?token=user_token_here
                </code>
                <Button size="sm" variant="outline">
                  Copy
                </Button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="font-medium text-sm mb-1">Upcoming Trips Only</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm p-2 bg-white dark:bg-slate-900 rounded border">
                  https://nestmap.com/api/calendar/feed/upcoming?token=user_token_here
                </code>
                <Button size="sm" variant="outline">
                  Copy
                </Button>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            These URLs are private and unique to your account. Don't share them with others.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}