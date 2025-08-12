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

      // The token is now in an httpOnly cookie, so we just need to refresh auth state
      await jwtAuth.refreshUser();

      onSuccess?.();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Google sign-in failed');
    }
  };

  const handleGoogleSignIn = () => {
    if (!clientId) {
      onError?.('Google Sign-In is not configured. Please add VITE_GOOGLE_CLIENT_ID to your environment variables.');
      return;
    }

    if (window.google) {
      // Use the Sign-In button flow directly instead of One Tap
      // This ensures we get an ID token, not an access token
      const buttonDiv = document.createElement('div');
      buttonDiv.style.display = 'none';
      document.body.appendChild(buttonDiv);

      window.google.accounts.id.renderButton(buttonDiv, {
        theme: 'outline',
        size: 'large',
      });

      // Trigger the button click programmatically
      const button = buttonDiv.querySelector('[role="button"]') as HTMLElement;
      if (button) {
        button.click();
      }

      // Clean up
      setTimeout(() => {
        if (buttonDiv.parentNode) {
          document.body.removeChild(buttonDiv);
        }
      }, 100);
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