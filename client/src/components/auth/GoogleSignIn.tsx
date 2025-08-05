import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Chrome } from 'lucide-react';
import { jwtAuth } from '@/lib/jwtAuth';

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleSignInProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function GoogleSignIn({ onSuccess, onError }: GoogleSignInProps) {
  useEffect(() => {
    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleResponse = async (response: any) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: response.credential,
        }),
      });

      if (!res.ok) {
        throw new Error('Google authentication failed');
      }

      const data = await res.json();
      
      // Set the auth token
      jwtAuth.setAuth(data.token, data.user);
      
      onSuccess?.();
    } catch (error) {
      console.error('Google auth error:', error);
      onError?.(error instanceof Error ? error.message : 'Google sign-in failed');
    }
  };

  const handleGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          // If One Tap is not displayed, fall back to button flow
          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            scope: 'email profile',
            callback: (response: any) => {
              // For OAuth2 flow, we get an access token
              // Convert to credential format for our backend
              handleGoogleResponse({ credential: response.access_token });
            },
          });
          tokenClient.requestAccessToken();
        }
      });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleSignIn}
      className="w-full"
    >
      <Chrome className="mr-2 h-4 w-4" />
      Continue with Google
    </Button>
  );
}