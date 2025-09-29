import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function PWAUpdatePrompt() {
  const { toast } = useToast();

  useEffect(() => {
    const handler = () => {
      const update = (window as any).__updateSW as undefined | ((reload?: boolean) => void);
      toast({
        title: 'Update available',
        description: 'A new version is ready. Reload to apply.',
        action: (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                if (typeof update === 'function') {
                  update(true);
                } else {
                  // Fallback
                  window.location.reload();
                }
              }}
            >
              Refresh
            </Button>
          </div>
        ),
      });
    };
    window.addEventListener('pwa-update-available', handler);
    return () => window.removeEventListener('pwa-update-available', handler);
  }, [toast]);

  return null;
}

