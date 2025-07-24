// Settings tab component
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Settings, Zap, Route, Clock, MapPin } from 'lucide-react';

export interface OptimizationSettings {
  autoOptimization: boolean;
  aggressiveOptimization: boolean;
  considerTraffic: boolean;
  bufferTime: number; // minutes
  maxTravelTime: number; // minutes
  preferredTransportModes: string[];
  optimizationGoals: string[];
  workingHours: {
    start: string;
    end: string;
    enabled: boolean;
  };
}

interface SettingsTabProps {
  settings: OptimizationSettings;
  onUpdateSettings: (newSettings: Partial<OptimizationSettings>) => void;
  onResetSettings: () => void;
}

export function SettingsTab({ settings, onUpdateSettings, onResetSettings }: SettingsTabProps) {
  const transportModes = [
    { id: 'walking', label: 'Walking', icon: '🚶' },
    { id: 'driving', label: 'Driving', icon: '🚗' },
    { id: 'transit', label: 'Public Transit', icon: '🚌' },
    { id: 'cycling', label: 'Cycling', icon: '🚴' }
  ];

  const optimizationGoals = [
    { id: 'minimize_travel', label: 'Minimize Travel Time', icon: <Route className="w-4 h-4" /> },
    { id: 'minimize_cost', label: 'Minimize Cost', icon: <Settings className="w-4 h-4" /> },
    { id: 'maximize_activities', label: 'Maximize Activities', icon: <MapPin className="w-4 h-4" /> },
    { id: 'balance_energy', label: 'Balance Energy', icon: <Zap className="w-4 h-4" /> }
  ];

  const toggleTransportMode = (mode: string) => {
    const current = settings.preferredTransportModes || [];
    const updated = current.includes(mode)
      ? current.filter(m => m !== mode)
      : [...current, mode];
    onUpdateSettings({ preferredTransportModes: updated });
  };

  const toggleOptimizationGoal = (goal: string) => {
    const current = settings.optimizationGoals || [];
    const updated = current.includes(goal)
      ? current.filter(g => g !== goal)
      : [...current, goal];
    onUpdateSettings({ optimizationGoals: updated });
  };

  return (
    <div className="space-y-6">
      {/* Core Optimization Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Optimization Settings
        </h3>
        
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Auto-Optimization</div>
              <div className="text-sm text-muted-foreground">
                Automatically optimize your schedule when changes are made
              </div>
            </div>
            <Switch
              checked={settings.autoOptimization}
              onCheckedChange={(checked) => onUpdateSettings({ autoOptimization: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Aggressive Optimization</div>
              <div className="text-sm text-muted-foreground">
                Make more significant changes for better optimization
              </div>
            </div>
            <Switch
              checked={settings.aggressiveOptimization}
              onCheckedChange={(checked) => onUpdateSettings({ aggressiveOptimization: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Consider Live Traffic</div>
              <div className="text-sm text-muted-foreground">
                Use real-time traffic data for travel time calculations
              </div>
            </div>
            <Switch
              checked={settings.considerTraffic}
              onCheckedChange={(checked) => onUpdateSettings({ considerTraffic: checked })}
            />
          </div>
        </div>
      </div>

      {/* Time Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Time Settings
        </h3>
        
        <div className="space-y-4 p-4 border rounded-lg">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Buffer Time</span>
              <span className="text-sm text-muted-foreground">{settings.bufferTime} minutes</span>
            </div>
            <Slider
              value={[settings.bufferTime]}
              onValueChange={(value) => onUpdateSettings({ bufferTime: value[0] })}
              max={60}
              min={0}
              step={5}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Extra time added between activities for unexpected delays
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Max Travel Time</span>
              <span className="text-sm text-muted-foreground">
                {settings.maxTravelTime < 60 
                  ? `${settings.maxTravelTime} minutes`
                  : `${Math.floor(settings.maxTravelTime / 60)}h ${settings.maxTravelTime % 60}m`
                }
              </span>
            </div>
            <Slider
              value={[settings.maxTravelTime]}
              onValueChange={(value) => onUpdateSettings({ maxTravelTime: value[0] })}
              max={180}
              min={15}
              step={15}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Maximum acceptable travel time between activities
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Working Hours</div>
              <div className="text-sm text-muted-foreground">
                Only schedule activities during specific hours
              </div>
            </div>
            <Switch
              checked={settings.workingHours.enabled}
              onCheckedChange={(enabled) => 
                onUpdateSettings({ 
                  workingHours: { ...settings.workingHours, enabled } 
                })
              }
            />
          </div>

          {settings.workingHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <input
                  type="time"
                  value={settings.workingHours.start}
                  onChange={(e) => 
                    onUpdateSettings({ 
                      workingHours: { ...settings.workingHours, start: e.target.value } 
                    })
                  }
                  className="w-full mt-1 p-2 border rounded text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <input
                  type="time"
                  value={settings.workingHours.end}
                  onChange={(e) => 
                    onUpdateSettings({ 
                      workingHours: { ...settings.workingHours, end: e.target.value } 
                    })
                  }
                  className="w-full mt-1 p-2 border rounded text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transport Preferences */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Route className="w-5 h-5" />
          Transport Preferences
        </h3>
        
        <div className="p-4 border rounded-lg">
          <div className="grid grid-cols-2 gap-3">
            {transportModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => toggleTransportMode(mode.id)}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  settings.preferredTransportModes?.includes(mode.id)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{mode.icon}</span>
                  <span className="font-medium">{mode.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Optimization Goals */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Optimization Goals
        </h3>
        
        <div className="p-4 border rounded-lg">
          <div className="space-y-3">
            {optimizationGoals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => toggleOptimizationGoal(goal.id)}
                className={`w-full p-3 border rounded-lg text-left transition-colors ${
                  settings.optimizationGoals?.includes(goal.id)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {goal.icon}
                  <span className="font-medium">{goal.label}</span>
                  {settings.optimizationGoals?.includes(goal.id) && (
                    <Badge variant="secondary" className="ml-auto">Active</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reset Settings */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          onClick={onResetSettings}
          className="w-full"
        >
          Reset to Default Settings
        </Button>
      </div>
    </div>
  );
}
