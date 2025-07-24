// Reminders tab component
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Clock, Bell, BellOff, MessageSquare } from 'lucide-react';

export interface Reminder {
  id: string;
  type: 'departure' | 'arrival' | 'preparation' | 'check_in';
  title: string;
  message: string;
  activity: any;
  scheduledTime: Date;
  minutesBefore: number;
  enabled: boolean;
  channels: ('push' | 'email' | 'sms')[];
}

interface RemindersTabProps {
  reminders: Reminder[];
  onToggleReminder: (reminderId: string, enabled: boolean) => void;
  onUpdateReminderTime: (reminderId: string, minutesBefore: number) => void;
  globalRemindersEnabled: boolean;
  onToggleGlobalReminders: (enabled: boolean) => void;
}

export function RemindersTab({
  reminders,
  onToggleReminder,
  onUpdateReminderTime,
  globalRemindersEnabled,
  onToggleGlobalReminders
}: RemindersTabProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'departure': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'arrival': return <Bell className="w-4 h-4 text-green-600" />;
      case 'preparation': return <MessageSquare className="w-4 h-4 text-yellow-600" />;
      case 'check_in': return <Bell className="w-4 h-4 text-purple-600" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getChannelBadgeColor = (channel: string) => {
    switch (channel) {
      case 'push': return 'bg-blue-100 text-blue-800';
      case 'email': return 'bg-green-100 text-green-800';
      case 'sms': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const timeOptions = [5, 10, 15, 30, 60, 120];

  return (
    <div className="space-y-6">
      {/* Global settings */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <div className="font-medium">Smart Reminders</div>
          <div className="text-sm text-muted-foreground">
            Automatically schedule reminders for your activities
          </div>
        </div>
        <Switch
          checked={globalRemindersEnabled}
          onCheckedChange={onToggleGlobalReminders}
        />
      </div>

      {!globalRemindersEnabled && (
        <div className="text-center py-8">
          <BellOff className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <div className="text-lg font-medium">Reminders Disabled</div>
          <div className="text-muted-foreground">Enable smart reminders to get notified about your activities.</div>
        </div>
      )}

      {globalRemindersEnabled && reminders.length === 0 && (
        <div className="text-center py-8">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <div className="text-lg font-medium">No Reminders Set</div>
          <div className="text-muted-foreground">Add activities to your schedule to see reminders here.</div>
        </div>
      )}

      {globalRemindersEnabled && reminders.length > 0 && (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`p-4 border rounded-lg transition-opacity ${
                reminder.enabled ? 'bg-background' : 'bg-muted/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getReminderIcon(reminder.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{reminder.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {reminder.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {reminder.message}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Scheduled: {formatTime(reminder.scheduledTime)}</span>
                      <span>•</span>
                      <span>{reminder.minutesBefore} min before</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {reminder.channels.map((channel) => (
                        <Badge
                          key={channel}
                          variant="secondary"
                          className={`text-xs ${getChannelBadgeColor(channel)}`}
                        >
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={reminder.minutesBefore}
                    onChange={(e) => onUpdateReminderTime(reminder.id, parseInt(e.target.value))}
                    disabled={!reminder.enabled}
                    className="text-xs border rounded px-2 py-1 bg-background"
                  >
                    {timeOptions.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`} before
                      </option>
                    ))}
                  </select>
                  <Switch
                    checked={reminder.enabled}
                    onCheckedChange={(enabled) => onToggleReminder(reminder.id, enabled)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
