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
  // Use the same client ID that was working before
  const clientId = '856158383068-c7806t6cmp3d26epm1cuktdmp299crfh.apps.googleusercontent.com';
  
  useEffect(() => {
    // Check if client ID is configured
    if (!clientId) {
      console.warn('Google Sign-In: VITE_GOOGLE_CLIENT_ID not configured');
      return;
    }

    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google && clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    };

    return () => {
      if (script.parentNode) {
        document.body.removeChild(script);
      }
    };
  }, [clientId]);

  const handleGoogleResponse = async (response: any) => {
    try {
      const res = await fetch('/api/auth/social/google', {
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
    if (!clientId) {
      onError?.('Google Sign-In is not configured. Please add VITE_GOOGLE_CLIENT_ID to your environment variables.');
      return;
    }
    
    if (window.google) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          // If One Tap is not displayed, fall back to button flow
          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
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