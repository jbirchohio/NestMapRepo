import { useState, useEffect } from 'react';
import { X, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/JWTAuthContext';

export default function DemoModeBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(true);
  const [timeToReset, setTimeToReset] = useState<string>('');

  // Check if user is a demo user
  const isDemoUser = user?.email?.includes('.demo') || user?.username?.startsWith('demo-');

  useEffect(() => {
    if (!isDemoUser) return;

    const updateTimer = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      
      // Calculate time to next reset (at :00 or :30)
      let minutesToReset = minutes < 30 ? 30 - minutes : 60 - minutes;
      let secondsToReset = 60 - seconds;
      
      if (secondsToReset === 60) {
        secondsToReset = 0;
      } else {
        minutesToReset -= 1;
      }

      setTimeToReset(`${minutesToReset}:${secondsToReset.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isDemoUser]);

  if (!isDemoUser || !visible) return null;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Demo Mode Active</span>
            </div>
            <span className="text-muted-foreground">
              You're exploring Remvana with sample data. Changes will be reset automatically.
            </span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Reset in {timeToReset}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/signup'}
              className="text-xs"
            >
              Start Free Trial
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisible(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}