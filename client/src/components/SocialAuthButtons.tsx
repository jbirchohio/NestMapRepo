import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { jwtAuth } from '@/lib/jwtAuth';
import { Loader2 } from 'lucide-react';

// Google Sign In
declare global {
  interface Window {
    google?: any;
  }
}

interface SocialAuthButtonsProps {
  mode: 'login' | 'signup';
  onSuccess?: () => void;
}

export default function SocialAuthButtons({ mode, onSuccess }: SocialAuthButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Load available providers
  useEffect(() => {
    fetch('/api/auth/social/providers')
      .then(res => res.json())
      .then(data => setProviders(data.providers || []))
      .catch(err => console.error('Failed to load social providers:', err));
  }, []);

  // Initialize Google Sign In
  useEffect(() => {
    const googleProvider = providers.find(p => p.name === 'google');
    if (googleProvider && window.google) {
      window.google.accounts.id.initialize({
        client_id: googleProvider.clientId,
        callback: handleGoogleResponse,
      });
    }
  }, [providers]);

  const handleGoogleResponse = async (response: any) => {
    setLoading('google');
    try {
      const res = await fetch('/api/auth/social/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      if (!res.ok) {
        throw new Error('Authentication failed');
      }

      const data = await res.json();
      
      // Update auth using jwtAuth
      jwtAuth.setAuth(data.token, data.user);
      
      toast({
        title: 'Success!',
        description: mode === 'login' ? 'Welcome back!' : 'Account created successfully!',
      });

      if (onSuccess) {
        onSuccess();
      } else {
        setLocation('/');
      }
    } catch (error) {
      console.error('Google auth error:', error);
      toast({
        title: 'Authentication failed',
        description: 'Could not sign in with Google. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleClick = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    }
  };


  const hasProviders = providers.length > 0;

  if (!hasProviders) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {providers.find(p => p.name === 'google') && (
        <Button
          variant="outline"
          onClick={handleGoogleClick}
          disabled={loading !== null}
          className="w-full"
        >
          {loading === 'google' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Continue with Google
        </Button>
      )}
    </div>
  );
}