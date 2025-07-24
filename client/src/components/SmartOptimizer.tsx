import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  AlertTriangle, 
  Clock, 
  RefreshCw,
  Target,
  Settings as SettingsIcon
} from 'lucide-react';

// Import decomposed components
import { OptimizationTab, type Optimization } from './optimizer/OptimizationTab';
import { ConflictsTab, type Conflict } from './optimizer/ConflictsTab';
import { RemindersTab, type Reminder } from './optimizer/RemindersTab';
import { SettingsTab, type OptimizationSettings } from './optimizer/SettingsTab';

interface OptimizableActivity {
  id: number;
  title: string;
  description: string;
  locationName: string;
  address?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  category: string;
  duration: number;
  startTime?: string;
  endTime?: string;
  day?: number;
  price?: number;
  rating?: number;
  imageUrl?: string;
  tags?: string[];
  status?: string;
}

interface SmartOptimizerProps {
  tripId: number;
  activities: OptimizableActivity[];
  onActivitiesUpdate: (activities: OptimizableActivity[]) => void;
}

export default function SmartOptimizer({ tripId, activities, onActivitiesUpdate }: SmartOptimizerProps) {
  const [isAutoOptimizeEnabled, setIsAutoOptimizeEnabled] = useState(true);
  const [showConflicts, setShowConflicts] = useState(true);
  const [selectedTab, setSelectedTab] = useState('optimization');
  const [settings, setSettings] = useState<OptimizationSettings>({
    autoOptimization: true,
    aggressiveOptimization: false,
    considerTraffic: true,
    bufferTime: 15,
    maxTravelTime: 60,
    preferredTransportModes: ['driving'],
    optimizationGoals: ['minimize_travel'],
    workingHours: {
      start: '09:00',
      end: '18:00',
      enabled: false
    }
  });

  // Fetch optimization data
  const { data: optimization, isLoading: optimizationLoading, refetch: refetchOptimization } = useQuery<Optimization>({
    queryKey: ['/api/optimize/schedule', tripId],
    enabled: !!tripId && activities.length > 0
  });

  const { data: conflicts, isLoading: conflictsLoading } = useQuery<Conflict[]>({
    queryKey: ['/api/conflicts/detect', tripId],
    enabled: !!tripId && activities.length > 0
  });

  const { data: reminders, isLoading: remindersLoading } = useQuery<Reminder[]>({
    queryKey: ['/api/reminders/smart', tripId],
    enabled: !!tripId && activities.length > 0
  });

  // Apply optimization mutation
  const applyOptimizationMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/optimize/apply', { tripId, activities }),
    onSuccess: (data: any) => {
      onActivitiesUpdate(data?.optimizedActivities || []);
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId] });
      refetchOptimization();
    }
  });

  // Auto-fix conflicts mutation
  const autoFixMutation = useMutation({
    mutationFn: (conflictIds: string[]) => apiRequest('POST', '/api/conflicts/autofix', { tripId, conflictIds }),
    onSuccess: (data: any) => {
      onActivitiesUpdate(data?.fixedActivities || []);
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts/detect', tripId] });
    }
  });

  // Reminder management mutations
  const toggleReminderMutation = useMutation({
    mutationFn: ({ reminderId, enabled }: { reminderId: string, enabled: boolean }) => 
      apiRequest('PUT', `/api/reminders/${reminderId}`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/smart', tripId] });
    }
  });

  const updateReminderTimeMutation = useMutation({
    mutationFn: ({ reminderId, minutesBefore }: { reminderId: string, minutesBefore: number }) => 
      apiRequest('PUT', `/api/reminders/${reminderId}`, { minutesBefore }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders/smart', tripId] });
    }
  });

  // Settings management
  const updateSettings = (newSettings: Partial<OptimizationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    // Trigger re-optimization if auto-optimization is enabled
    if (settings.autoOptimization) {
      refetchOptimization();
    }
  };

  const resetSettings = () => {
    setSettings({
      autoOptimization: true,
      aggressiveOptimization: false,
      considerTraffic: true,
      bufferTime: 15,
      maxTravelTime: 60,
      preferredTransportModes: ['driving'],
      optimizationGoals: ['minimize_travel'],
      workingHours: {
        start: '09:00',
        end: '18:00',
        enabled: false
      }
    });
  };

  const hasConflicts = conflicts && Array.isArray(conflicts) && conflicts.length > 0;
  const hasOptimizations = optimization && optimization.improvements && Array.isArray(optimization.improvements);
  
  if (optimizationLoading || conflictsLoading || remindersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            Smart Optimizer Loading...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            Smart Trip Optimization
          </CardTitle>
          <CardDescription>
            AI-powered schedule optimization and conflict detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Target className="w-8 h-8 text-blue-600" />
              <div>
                <div className="font-medium">Optimization Score</div>
                <div className="text-2xl font-bold text-blue-600">
                  {hasOptimizations ? `${Math.round(optimization.improvements?.[0]?.efficiencyGain || 0)}%` : 'N/A'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Efficiency gain</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Clock className="w-8 h-8 text-green-600" />
              <div>
                <div className="font-medium">Time Saved</div>
                <div className="text-2xl font-bold text-green-600">
                  {hasOptimizations ? `${optimization.improvements?.[0]?.timeSaved || 0}m` : '0m'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Travel time reduced</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <div className="font-medium">Conflicts</div>
                <div className="text-2xl font-bold text-red-600">
                  {hasConflicts ? conflicts.length : 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Issues detected</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={isAutoOptimizeEnabled}
                onCheckedChange={setIsAutoOptimizeEnabled}
              />
              <span className="text-sm font-medium">Auto-optimize schedule</span>
            </div>
            
            <Button
              onClick={() => refetchOptimization()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Analysis
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {hasConflicts && showConflicts && (
        <Alert className="border-destructive/20 bg-destructive/10">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>{conflicts.length} scheduling conflicts detected</strong> that may affect your trip
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  const autoFixableConflicts = conflicts
                    .filter((c: any) => c.autoFixAvailable)
                    .map((c: any) => c.id);
                  if (autoFixableConflicts.length > 0) {
                    autoFixMutation.mutate(autoFixableConflicts);
                  }
                }}
                disabled={autoFixMutation.isPending}
              >
                {autoFixMutation.isPending ? 'Fixing...' : 'Auto-Fix'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConflicts(false)}
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs Interface */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <div className="px-6 pt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="optimization">Optimization</TabsTrigger>
                <TabsTrigger value="conflicts">
                  Conflicts {hasConflicts && `(${conflicts.length})`}
                </TabsTrigger>
                <TabsTrigger value="reminders">Reminders</TabsTrigger>
                <TabsTrigger value="settings">
                  <SettingsIcon className="w-4 h-4 mr-1" />
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="optimization">
                <OptimizationTab
                  optimization={optimization}
                  isLoading={optimizationLoading}
                  onApplyOptimization={() => applyOptimizationMutation.mutate()}
                  isApplying={applyOptimizationMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="conflicts">
                <ConflictsTab
                  conflicts={conflicts || []}
                  onAutoFix={(conflictIds) => autoFixMutation.mutate(conflictIds)}
                  isFixing={autoFixMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="reminders">
                <RemindersTab
                  reminders={reminders || []}
                  onToggleReminder={(reminderId, enabled) => 
                    toggleReminderMutation.mutate({ reminderId, enabled })
                  }
                  onUpdateReminderTime={(reminderId, minutesBefore) => 
                    updateReminderTimeMutation.mutate({ reminderId, minutesBefore })
                  }
                  globalRemindersEnabled={settings.autoOptimization}
                  onToggleGlobalReminders={(enabled) => 
                    updateSettings({ autoOptimization: enabled })
                  }
                />
              </TabsContent>

              <TabsContent value="settings">
                <SettingsTab
                  settings={settings}
                  onUpdateSettings={updateSettings}
                  onResetSettings={resetSettings}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
