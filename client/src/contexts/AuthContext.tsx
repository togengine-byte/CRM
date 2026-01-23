import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

/**
 * User roles available in the system
 */
export type UserRole = 'admin' | 'employee' | 'customer' | 'supplier' | 'courier';

/**
 * User status types
 */
export type UserStatus = 'pending_approval' | 'active' | 'rejected' | 'deactivated';

/**
 * User interface with strict typing
 */
export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  permissions: Record<string, boolean> | null;
  status: UserStatus;
  phone?: string | null;
  companyName?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  // Helper functions for permission checking
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  isCustomer: boolean;
  isSupplier: boolean;
  isCourier: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check current session on mount
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        // Validate user data before setting
        if (userData && typeof userData.id === 'number' && userData.role) {
          setUser(userData as User);
          setError(null);
        } else {
          console.error("[Auth] Invalid user data received:", userData);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("[Auth] Session check failed:", err);
      setUser(null);
      setError("Failed to check authentication status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("[Auth] Logout failed:", err);
    } finally {
      setUser(null);
    }
  };

  const refresh = async () => {
    setLoading(true);
    await checkSession();
  };

  /**
   * Check if user has one of the specified roles
   * Admin always returns true
   */
  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  }, [user]);

  /**
   * Check if user has a specific permission
   * Admin always returns true
   * Only employees have granular permissions
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role !== 'employee') return false;
    
    return user.permissions?.[permission] === true;
  }, [user]);

  // Role convenience getters
  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee' || isAdmin;
  const isCustomer = user?.role === 'customer';
  const isSupplier = user?.role === 'supplier';
  const isCourier = user?.role === 'courier';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user && user.status === 'active',
        logout,
        refresh,
        hasRole,
        hasPermission,
        isAdmin,
        isEmployee,
        isCustomer,
        isSupplier,
        isCourier,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 * Must be used within AuthProvider
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

/**
 * Hook to get current user with type assertion
 * Throws if user is not authenticated
 * Use only in components wrapped with ProtectedRoute
 */
export function useCurrentUser(): User {
  const { user } = useAuthContext();
  if (!user) {
    throw new Error("useCurrentUser must be used in authenticated context");
  }
  return user;
}
