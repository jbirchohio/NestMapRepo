import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
      <DialogContent className="sm:max-w-md md:max-w-lg p-0 bg-transparent border-none shadow-none">
        {view === "login" ? (
          <LoginForm onSuccess={handleSuccess} onToggleForm={toggleView} />
        ) : (
          <SignupForm onSuccess={handleSuccess} onToggleForm={toggleView} />
        )}
      </DialogContent>
    </Dialog>
  );
}