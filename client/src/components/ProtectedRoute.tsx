import { useAuthContext } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "./ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, logout } = useAuthContext();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (!loading && !isAuthenticated) {
      setLocation("/");
    }
  }, [loading, isAuthenticated, setLocation]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check user status
  if (user.status !== 'active') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            החשבון שלך אינו פעיל
          </h1>
          <p className="text-gray-600 mb-6">
            פנה למנהל המערכת להפעלת החשבון.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            מחובר כ: {user.email}
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={async () => {
                await logout();
                setLocation("/");
              }}
              className="w-full"
            >
              התנתק וחזור לעמוד הראשי
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check required role if specified
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            אין לך הרשאה לעמוד זה
          </h1>
          <p className="text-gray-600 mb-6">
            העמוד הזה דורש הרשאות {requiredRole === 'admin' ? 'מנהל' : requiredRole}.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setLocation("/dashboard")}
              className="w-full"
            >
              חזרה ללוח הבקרה
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
  const { user } = useAuthContext();
  return user;
}
