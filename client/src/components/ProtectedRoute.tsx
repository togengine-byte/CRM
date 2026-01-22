import { useAuth, useUser } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "./ui/button";

// Allowed admin emails - only these users can access the dashboard
const ALLOWED_ADMIN_EMAILS = [
  "idicrmai@gmail.com", // איתמר - מנהל המערכת
];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    // Not signed in - redirect to landing page
    if (!isSignedIn) {
      setLocation("/");
      return;
    }

    // Check if user email is in allowed list
    if (user) {
      const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase();
      const isAllowed = ALLOWED_ADMIN_EMAILS.some(
        email => email.toLowerCase() === userEmail
      );
      setIsAuthorized(isAllowed);
    }
  }, [isSignedIn, isLoaded, user, setLocation]);

  // Loading state
  if (!isLoaded || (isSignedIn && isAuthorized === null)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return null;
  }

  // Signed in but not authorized (email not in allowed list)
  if (isAuthorized === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            אין לך הרשאה לגשת למערכת
          </h1>
          <p className="text-gray-600 mb-6">
            המערכת פתוחה למנהלים מורשים בלבד. אם אתה חושב שזו טעות, פנה למנהל המערכת.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            מחובר כ: {user?.emailAddresses[0]?.emailAddress}
          </p>
          <Button
            onClick={() => {
              // Sign out and redirect to landing page
              window.location.href = "/";
            }}
            className="w-full"
          >
            חזרה לעמוד הראשי
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
