import { useAuthContext } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Loader2, ShieldX, LogIn } from "lucide-react";
import { Button } from "./ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string;
}

/**
 * ProtectedRoute - רכיב הגנה על נתיבים מוגנים
 * 
 * רכיב זה מבטיח שרק משתמשים מאומתים ומורשים יכולים לגשת לתוכן מוגן.
 * הוא מבצע את הבדיקות הבאות:
 * 1. האם המשתמש מאומת (logged in)
 * 2. האם סטטוס המשתמש פעיל (active)
 * 3. האם למשתמש יש את התפקיד הנדרש (אם צוין)
 * 4. האם למשתמש יש את ההרשאה הנדרשת (אם צוינה)
 */
export function ProtectedRoute({ children, requiredRole, requiredPermission }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, logout } = useAuthContext();
  const [, setLocation] = useLocation();

  // Loading state - מציג אנימציית טעינה בזמן בדיקת האימות
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  // CRITICAL SECURITY CHECK: משתמש לא מאומת - חסום גישה והפנה להתחברות
  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            נדרשת התחברות
          </h1>
          <p className="text-gray-600 mb-6">
            כדי לגשת לעמוד זה, עליך להתחבר למערכת.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setLocation("/")}
              className="w-full"
            >
              עבור לעמוד ההתחברות
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // בדיקת סטטוס משתמש - רק משתמשים פעילים יכולים לגשת
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
          <p className="text-gray-600 mb-4">
            {user.status === 'pending_approval' && 'החשבון שלך ממתין לאישור מנהל המערכת.'}
            {user.status === 'rejected' && 'בקשת ההרשמה שלך נדחתה. פנה למנהל המערכת לפרטים נוספים.'}
            {user.status === 'deactivated' && 'החשבון שלך הושבת. פנה למנהל המערכת להפעלה מחדש.'}
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

  // בדיקת תפקיד נדרש (אם צוין)
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = roles.includes(user.role) || user.role === 'admin';
    
    if (!hasRequiredRole) {
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
              העמוד הזה דורש הרשאות מיוחדות שאינן זמינות לחשבון שלך.
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
  }

  // בדיקת הרשאה ספציפית (עבור עובדים עם הרשאות מותאמות)
  if (requiredPermission && user.role === 'employee') {
    const permissions = user.permissions as Record<string, boolean> | null;
    const hasPermission = permissions?.[requiredPermission] === true;
    
    if (!hasPermission) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldX className="w-8 h-8 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              אין לך הרשאה לפעולה זו
            </h1>
            <p className="text-gray-600 mb-6">
              פנה למנהל המערכת כדי לקבל את ההרשאות הנדרשות.
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
  }

  // כל הבדיקות עברו - הצג את התוכן המוגן
  return <>{children}</>;
}

/**
 * Hook לקבלת מידע על המשתמש המורשה
 * יש להשתמש בו רק בתוך רכיבים שעטופים ב-ProtectedRoute
 */
export function useAuthorizedUser() {
  const { user } = useAuthContext();
  if (!user) {
    throw new Error('useAuthorizedUser must be used within a ProtectedRoute');
  }
  return user;
}

/**
 * Hook לבדיקת הרשאה ספציפית
 */
export function useHasPermission(permission: string): boolean {
  const { user } = useAuthContext();
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'employee') return false;
  
  const permissions = user.permissions as Record<string, boolean> | null;
  return permissions?.[permission] === true;
}

/**
 * Hook לבדיקת תפקיד
 */
export function useHasRole(roles: string | string[]): boolean {
  const { user } = useAuthContext();
  if (!user) return false;
  
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return roleArray.includes(user.role) || user.role === 'admin';
}
