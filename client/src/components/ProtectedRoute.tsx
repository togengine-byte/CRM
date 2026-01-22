import { useAuth, useUser, useClerk } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

interface AuthorizedUser {
  id: number;
  email: string | null;
  name: string | null;
  role: string;
  permissions: unknown;
  status: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const [authState, setAuthState] = useState<{
    checking: boolean;
    authorized: boolean;
    user: AuthorizedUser | null;
    reason?: string;
  }>({
    checking: true,
    authorized: false,
    user: null,
  });

  // Get user email from Clerk
  const userEmail = user?.emailAddresses[0]?.emailAddress?.toLowerCase();

  // Query to check if user exists in database
  const { data: authCheck, isLoading: isCheckingAuth, error } = trpc.auth.checkUserByEmail.useQuery(
    { email: userEmail || "" },
    {
      enabled: !!userEmail && isSignedIn && isLoaded,
      retry: false,
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    }
  );

  useEffect(() => {
    if (!isLoaded) return;

    // Not signed in - redirect to landing page
    if (!isSignedIn) {
      setLocation("/");
      return;
    }

    // Still checking auth
    if (isCheckingAuth || !userEmail) {
      setAuthState({ checking: true, authorized: false, user: null });
      return;
    }

    // Error checking auth
    if (error) {
      console.error("[ProtectedRoute] Auth check error:", error);
      setAuthState({ checking: false, authorized: false, user: null, reason: 'error' });
      return;
    }

    // Got auth result
    if (authCheck) {
      if (authCheck.authorized && authCheck.user) {
        // Check required role if specified
        if (requiredRole && authCheck.user.role !== requiredRole) {
          setAuthState({
            checking: false,
            authorized: false,
            user: authCheck.user,
            reason: 'insufficient_role',
          });
        } else {
          setAuthState({
            checking: false,
            authorized: true,
            user: authCheck.user,
          });
        }
      } else {
        setAuthState({
          checking: false,
          authorized: false,
          user: null,
          reason: authCheck.reason || 'not_in_database',
        });
      }
    }
  }, [isSignedIn, isLoaded, userEmail, isCheckingAuth, authCheck, error, requiredRole, setLocation]);

  // Loading state
  if (!isLoaded || authState.checking) {
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

  // Signed in but not authorized
  if (!authState.authorized) {
    const getErrorMessage = () => {
      switch (authState.reason) {
        case 'not_in_database':
          return 'המייל שלך לא רשום במערכת. פנה למנהל המערכת להוספת הרשאות.';
        case 'user_not_active':
          return 'החשבון שלך אינו פעיל. פנה למנהל המערכת.';
        case 'insufficient_role':
          return 'אין לך הרשאה מספקת לגשת לעמוד זה.';
        case 'error':
          return 'אירעה שגיאה בבדיקת ההרשאות. נסה שוב מאוחר יותר.';
        default:
          return 'אין לך הרשאה לגשת למערכת.';
      }
    };

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
            {getErrorMessage()}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            מחובר כ: {userEmail}
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={async () => {
                await signOut();
                setLocation("/");
              }}
              className="w-full"
            >
              התנתק וחזור לעמוד הראשי
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
              className="w-full"
            >
              חזרה לעמוד הראשי
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Export a hook to get the authorized user info in child components
export function useAuthorizedUser() {
  const { user } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
  
  const { data: authCheck } = trpc.auth.checkUserByEmail.useQuery(
    { email: userEmail || "" },
    {
      enabled: !!userEmail,
      staleTime: 1000 * 60 * 5,
    }
  );

  return authCheck?.user || null;
}
