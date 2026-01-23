import { ReactNode } from "react";
import { useAuthContext, UserRole } from "@/contexts/AuthContext";
import { ShieldX } from "lucide-react";

interface RoleGuardProps {
  children: ReactNode;
  /** Required role(s) to view this content */
  requiredRole?: UserRole | UserRole[];
  /** Required permission for employees */
  requiredPermission?: string;
  /** What to show if access is denied (default: nothing) */
  fallback?: ReactNode;
  /** Show a message when access is denied instead of hiding */
  showDeniedMessage?: boolean;
}

/**
 * RoleGuard - רכיב להגנה על תוכן בתוך עמודים
 * 
 * משמש להסתרה או הצגת תוכן בהתאם להרשאות המשתמש.
 * שונה מ-ProtectedRoute בכך שהוא לא מפנה לעמוד אחר,
 * אלא פשוט מסתיר את התוכן או מציג הודעה.
 * 
 * @example
 * // הצג רק לאדמין
 * <RoleGuard requiredRole="admin">
 *   <AdminOnlyButton />
 * </RoleGuard>
 * 
 * @example
 * // הצג לאדמין ועובדים
 * <RoleGuard requiredRole={['admin', 'employee']}>
 *   <ManagementPanel />
 * </RoleGuard>
 * 
 * @example
 * // הצג לעובדים עם הרשאה ספציפית
 * <RoleGuard requiredPermission="canApproveCustomers">
 *   <ApproveButton />
 * </RoleGuard>
 */
export function RoleGuard({ 
  children, 
  requiredRole, 
  requiredPermission,
  fallback = null,
  showDeniedMessage = false,
}: RoleGuardProps) {
  const { user, hasRole, hasPermission } = useAuthContext();

  // No user - don't show anything
  if (!user) {
    return <>{fallback}</>;
  }

  // Check role requirement
  if (requiredRole) {
    if (!hasRole(requiredRole)) {
      if (showDeniedMessage) {
        return <AccessDeniedMessage />;
      }
      return <>{fallback}</>;
    }
  }

  // Check permission requirement
  if (requiredPermission) {
    if (!hasPermission(requiredPermission)) {
      if (showDeniedMessage) {
        return <AccessDeniedMessage />;
      }
      return <>{fallback}</>;
    }
  }

  // All checks passed - render children
  return <>{children}</>;
}

/**
 * Small inline message for denied access
 */
function AccessDeniedMessage() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
      <ShieldX className="h-4 w-4" />
      <span>אין לך הרשאה לצפות בתוכן זה</span>
    </div>
  );
}

/**
 * Hook לבדיקת הרשאה בתוך קומפוננטה
 * מחזיר true אם למשתמש יש את ההרשאה הנדרשת
 */
export function useCanAccess(requiredRole?: UserRole | UserRole[], requiredPermission?: string): boolean {
  const { user, hasRole, hasPermission } = useAuthContext();

  if (!user) return false;

  if (requiredRole && !hasRole(requiredRole)) {
    return false;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return false;
  }

  return true;
}

/**
 * AdminOnly - קיצור דרך להצגת תוכן רק לאדמין
 */
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard requiredRole="admin" fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/**
 * EmployeeOnly - קיצור דרך להצגת תוכן לאדמין ועובדים
 */
export function EmployeeOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard requiredRole={['admin', 'employee']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}
