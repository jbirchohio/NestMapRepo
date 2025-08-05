import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/JWTAuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: "login" | "signup";
  redirectPath?: string;
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  initialView = "login",
  redirectPath = "/"
}: AuthModalProps) {
  const [view, setView] = useState<"login" | "signup">(initialView);
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: ''
  });

  // Update view when initialView changes
  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (view === 'login') {
        await signIn(formData.email, formData.password);
      } else {
        await signUp(formData.email, formData.password, formData.username);
      }
      onClose();
      if (redirectPath) {
        window.location.href = redirectPath;
      }
    } catch (error: any) {
      setError(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-md p-0">
        <Card className="border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-lg">
              {view === 'login' ? 'Welcome back!' : 'Join Remvana'}
            </CardTitle>
            <CardDescription>
              {view === 'login' 
                ? 'Sign in to continue planning trips' 
                : 'Start planning amazing trips in seconds'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {view === 'signup' && (
                <div>
                  <Label htmlFor="username">Name</Label>
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="What should we call you?"
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={view === 'login' ? 'Enter your password' : 'Choose a secure password'}
                  required
                  minLength={view === 'signup' ? 6 : undefined}
                />
                {view === 'signup' && (
                  <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white"
              >
                {isLoading 
                  ? (view === 'login' ? 'Signing in...' : 'Creating account...') 
                  : (view === 'login' ? 'Sign In' : 'Create Free Account')}
              </Button>

              <div className="text-center text-sm">
                <span className="text-gray-600">
                  {view === 'login' ? "Don't have an account? " : "Already have an account? "}
                </span>
                <Button
                  type="button"
                  variant="link"
                  className="text-purple-600 hover:text-purple-700 p-0"
                  onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                >
                  {view === 'login' ? 'Sign up free' : 'Sign in'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}