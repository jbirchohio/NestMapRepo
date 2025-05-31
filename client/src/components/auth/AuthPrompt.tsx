import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { UserRound, MapPin } from "lucide-react";
import AuthModal from "./AuthModal";

interface AuthPromptProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onContinue?: () => void;
}

export default function AuthPrompt({
  title = "Sign in to continue",
  description = "Create an account to save your trips and access them from any device.",
  actionLabel = "Create a free account",
  onContinue
}: AuthPromptProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup">("signup");

  const handleSignIn = () => {
    setAuthView("login");
    setIsAuthModalOpen(true);
  };

  const handleSignUp = () => {
    setAuthView("signup");
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    if (onContinue) {
      onContinue();
    }
  };

  return (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultView={authView}
        onSuccess={handleAuthSuccess}
      />

      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <UserRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium">Save your trips</h4>
              <p className="text-xs text-muted-foreground">Access your trip plans from any device</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium">Collaborate with others</h4>
              <p className="text-xs text-muted-foreground">Share trips with friends and family</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button 
            className="w-full" 
            onClick={handleSignUp}
          >
            {actionLabel}
          </Button>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Button
              variant="link"
              className="p-0 h-auto font-medium"
              onClick={handleSignIn}
            >
              Sign in
            </Button>
          </div>
        </CardFooter>
      </Card>
    </>
  );
}