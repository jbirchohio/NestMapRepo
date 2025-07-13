import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Route,
  Bell,
  Calendar,
  TrendingUp,
  Settings,
  RefreshCw,
  Target
} from 'lucide-react';

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

  // Fetch optimization data
  const { data: optimization, isLoading: optimizationLoading, refetch: refetchOptimization } = useQuery({
    queryKey: ['/api/optimize/schedule', tripId],
    enabled: !!tripId && activities.length > 0
  });

  const { data: conflicts, isLoading: conflictsLoading } = useQuery({
    queryKey: ['/api/conflicts/detect', tripId],
    enabled: !!tripId && activities.length > 0
  });

  const { data: reminders, isLoading: remindersLoading } = useQuery({
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

  const hasConflicts = conflicts && Array.isArray(conflicts) && conflicts.length > 0;
  const hasOptimizations = optimization && (optimization as any).improvements && Array.isArray((optimization as any).improvements);
  
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
                  {hasOptimizations ? `${Math.round((optimization as any).improvements?.efficiencyGain || 0)}%` : 'N/A'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Efficiency gain</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Clock className="w-8 h-8 text-green-600" />
              <div>
                <div className="font-medium">Time Saved</div>
                <div className="text-2xl font-bold text-green-600">
                  {hasOptimizations ? `${(optimization as any).improvements?.timeSaved || 0}m` : '0m'}
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
                Auto-Fix
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

      {/* Detailed Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="optimization">Optimization</TabsTrigger>
              <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
              <TabsTrigger value="reminders">Reminders</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="optimization" className="space-y-4">
              <OptimizationTab 
                optimization={optimization} 
                onApplyOptimization={() => applyOptimizationMutation.mutate()}
                isApplying={applyOptimizationMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="conflicts" className="space-y-4">
              <ConflictsTab 
                conflicts={conflicts || []} 
                onAutoFix={(conflictIds: any) => autoFixMutation.mutate(conflictIds)}
                isFixing={autoFixMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="reminders" className="space-y-4">
              <RemindersTab reminders={reminders || []} />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <SettingsTab 
                isAutoOptimizeEnabled={isAutoOptimizeEnabled}
                onAutoOptimizeChange={setIsAutoOptimizeEnabled}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface OptimizationImprovement {
  efficiencyGain: number;
  timeSaved: number;
  routeChanges: number;
  suggestedActivities: OptimizableActivity[];
  optimizedSchedule: OptimizableActivity[];
}

interface Optimization {
  id: string;
  tripId: number;
  improvements: OptimizationImprovement;
  createdAt: string;
  status: 'pending' | 'completed' | 'failed';
}

interface OptimizationTabProps {
  optimization: Optimization;
  onApplyOptimization: () => void;
  isApplying: boolean;
}

function OptimizationTab({ optimization, onApplyOptimization, isApplying }: OptimizationTabProps) {
  if (!optimization) {
    return (
      <div className="text-center py-8 text-gray-500">
        No optimization suggestions available yet.
      </div>
    );
  }

  const { improvements, recommendations } = optimization;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Efficiency Improvements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Travel Time Reduced</span>
                <span className="font-bold text-green-600">{improvements.travelTimeReduced}min</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Conflicts Resolved</span>
                <span className="font-bold text-primary">{improvements.conflictsResolved}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Overall Efficiency</span>
                <span className="font-bold text-primary">{improvements.efficiencyGain}%</span>
              </div>
            </div>
            <Progress value={improvements.efficiencyGain} className="mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Smart Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.map((rec: string, index: number) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={onApplyOptimization}
          disabled={isApplying}
          className="flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          {isApplying ? 'Applying Optimization...' : 'Apply Smart Optimization'}
        </Button>
      </div>
    </div>
  );
}

interface Conflict {
  id: string;
  type: 'time' | 'location' | 'budget' | 'logistics';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedActivities: OptimizableActivity[];
  autoFixAvailable: boolean;
  suggestedFix?: string;
}

interface ConflictsTabProps {
  conflicts: Conflict[];
  onAutoFix: (conflictIds: string[]) => void;
  isFixing: boolean;
}

function ConflictsTab({ conflicts, onAutoFix, isFixing }: ConflictsTabProps) {
  if (conflicts.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <div className="text-lg font-medium">No conflicts detected!</div>
        <div className="text-gray-600 dark:text-gray-300">Your schedule is perfectly optimized.</div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'medium': return 'text-yellow-700 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-primary bg-primary/10 border-primary/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const autoFixableConflicts = conflicts.filter((c: any) => c.autoFixAvailable);

  return (
    <div className="space-y-4">
      {autoFixableConflicts.length > 0 && (
        <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
          <div>
            <div className="font-medium">Auto-fix Available</div>
            <div className="text-sm text-muted-foreground">
              {autoFixableConflicts.length} conflicts can be automatically resolved
            </div>
          </div>
          <Button
            onClick={() => onAutoFix(autoFixableConflicts.map((c: any) => c.id))}
            disabled={isFixing}
            className="flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {isFixing ? 'Fixing...' : 'Auto-Fix All'}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {conflicts.map((conflict: any, index: number) => (
          <Alert key={index} className={getSeverityColor(conflict.severity)}>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium">{conflict.description}</div>
                  <div className="text-sm mt-1 opacity-75">{conflict.suggestedFix}</div>
                  <div className="flex gap-1 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {conflict.type.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {conflict.severity} priority
                    </Badge>
                  </div>
                </div>
                {conflict.autoFixAvailable && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAutoFix([conflict.id])}
                    disabled={isFixing}
                  >
                    Fix
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  );
}

interface Reminder {
  id: string;
  type: 'booking' | 'preparation' | 'weather' | 'logistics' | 'safety';
  priority: 'low' | 'medium' | 'high';
  message: string;
  dueDate?: string;
  relatedActivityId?: number;
  isCompleted: boolean;
}

interface RemindersTabProps {
  reminders: Reminder[];
}

function RemindersTab({ reminders }: RemindersTabProps) {
  const groupedReminders = reminders.reduce((acc: Record<string, Reminder[]>, reminder: Reminder) => {
    const type = reminder.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(reminder);
    return acc;
  }, {});

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'departure': return <Route className="w-4 h-4" />;
      case 'preparation': return <Settings className="w-4 h-4" />;
      case 'booking': return <Calendar className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Smart reminders are automatically generated based on your activities and will be sent at optimal times.
      </div>

      {Object.keys(groupedReminders).map(type => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 capitalize">
              {getReminderIcon(type)}
              {type.replace('_', ' ')} Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {groupedReminders[type].map((reminder: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{reminder.title}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{reminder.message}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(reminder.scheduledTime).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {reminders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No smart reminders generated yet. Add more activities to get personalized notifications.
        </div>
      )}
    </div>
  );
}

interface SettingsTabProps {
  isAutoOptimizeEnabled: boolean;
  onAutoOptimizeChange: (enabled: boolean) => void;
}

function SettingsTab({ isAutoOptimizeEnabled, onAutoOptimizeChange }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Optimization Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Auto-optimize schedule</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Automatically optimize your itinerary when changes are made
              </div>
            </div>
            <Switch
              checked={isAutoOptimizeEnabled}
              onCheckedChange={onAutoOptimizeChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Smart conflict detection</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Detect and alert about scheduling conflicts in real-time
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Intelligent reminders</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Generate smart reminders based on your activities
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Optimization Criteria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Minimize travel time</span>
              <Badge>High Priority</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Avoid venue conflicts</span>
              <Badge>High Priority</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Optimize for crowds</span>
              <Badge variant="secondary">Medium Priority</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>Weather considerations</span>
              <Badge variant="secondary">Medium Priority</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
