import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/state/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login } = useAuth();
    const [, setLocation] = useLocation();
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Email and password are required');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            await login(email, password);
            setLocation('/dashboard');
        } catch (err) {
            console.error('Login failed:', err);
            setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    // OAuth provider sign-in functionality will be implemented in a future update
    return (<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Welcome to NestMap
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error || 'An error occurred during login'}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required/>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required/>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <Separator />

            <div className="space-y-2">
              <Button type="button" variant="outline" className="w-full" disabled={isLoading}>
              Continue with Google (Coming Soon)
            </Button>

            <Button type="button" variant="outline" className="w-full" disabled={isLoading}>
              Continue with GitHub (Coming Soon)
            </Button>
            </div>

            <Separator />

            <Button 
              type="button" 
              variant="secondary" 
              className="w-full" 
              onClick={() => {
                // Set demo credentials and submit
                setEmail('demo@example.com');
                setPassword('demo123');
                // The form will handle submission automatically due to React's state batching
              }} 
              disabled={isLoading}
            >
              Continue with Demo Mode
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
              </span>
              <Link href="/signup" className="text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>);
}
