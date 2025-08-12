import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function EmergencyLogout() {
  const handleEmergencyLogout = () => {
    // Clear all localStorage
    localStorage.clear();

    // Clear all sessionStorage
    sessionStorage.clear();

    // Force reload to clear all state
    window.location.href = '/';
  };

  return (
    <Button
      onClick={handleEmergencyLogout}
      variant="destructive"
      size="sm"
      className="fixed top-4 right-4 z-50"
    >
      <LogOut className="w-4 h-4 mr-2" />
      Emergency Logout
    </Button>
  );
}