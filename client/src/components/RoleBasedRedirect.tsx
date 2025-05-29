import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function RoleBasedRedirect() {
  const { roleType, authReady, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Only redirect if authentication is ready and user is logged in
    if (!authReady || !user) return;

    // Map role types to dashboard routes
    if (roleType === 'agency') {
      setLocation('/dashboard/agency');
    } else if (roleType === 'corporate') {
      setLocation('/dashboard/corporate');
    } else {
      // Default to corporate dashboard if role type is not set
      setLocation('/dashboard/corporate');
    }
  }, [authReady, user, roleType, setLocation]);

  return null; // This component doesn't render anything
}