import { useAuth } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded, sessionClaims } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setLocation("/login");
      return;
    }

    // Check role if required
    if (requiredRole) {
      const userRole = sessionClaims?.metadata?.role;
      if (userRole !== requiredRole) {
        setLocation("/");
        return;
      }
    }
  }, [isSignedIn, isLoaded, requiredRole, setLocation, sessionClaims]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return <>{children}</>;
}
