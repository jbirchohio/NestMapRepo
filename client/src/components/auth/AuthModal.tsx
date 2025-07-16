import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultView?: "login" | "signup";
  onSuccess?: () => void;
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  defaultView = "login",
  onSuccess
}: AuthModalProps) {
  const [view, setView] = useState<"login" | "signup">(defaultView);

  // Update view when defaultView changes
  useEffect(() => {
    setView(defaultView);
  }, [defaultView]);

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
    }
    onClose();
  };

  const toggleView = () => {
    setView(view === "login" ? "signup" : "login");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent 
        className="p-0 bg-transparent border-none shadow-none"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90vw',
          maxWidth: '400px',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: 0,
          zIndex: 50,
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem'
        }}
      >
        <DialogTitle className="text-2xl font-bold text-center mb-2">
          {view === 'login' ? 'Welcome Back' : 'Create an Account'}
        </DialogTitle>
        <DialogDescription className="text-center mb-6">
          {view === 'login' 
            ? 'Sign in to access your account' 
            : 'Join us to get started'}
        </DialogDescription>
        
        {view === "login" ? (
          <LoginForm onSuccess={handleSuccess} onToggleForm={toggleView} />
        ) : (
          <SignupForm onSuccess={handleSuccess} onToggleForm={toggleView} />
        )}
      </DialogContent>
    </Dialog>
  );
}
