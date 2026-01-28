import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelRight, Users, FileText, Truck, Package, BarChart3, Settings, Menu, X, ShoppingBag, User, Shield, Briefcase, Bell, CheckCircle, Clock, PackageCheck, PackageX, Archive } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

// Menu items for admin users - full access
const adminMenuItems = [
  { icon: LayoutDashboard, label: "לוח בקרה", path: "/dashboard" },
  { icon: FileText, label: "הצעות מחיר", path: "/quotes" },
  { icon: Clock, label: "ממתין לאישור לקוח", path: "/pending-approval" },
  { icon: CheckCircle, label: "אושר על ידי הלקוח", path: "/customer-approved" },
  { icon: Briefcase, label: "עבודות בביצוע", path: "/jobs" },
  { icon: PackageCheck, label: "ממתין לאיסוף", path: "/ready-for-pickup" },
  { icon: Truck, label: "נאסף", path: "/picked-up" },
  { icon: Archive, label: "נמסר", path: "/delivered" },
  { icon: Users, label: "לקוחות", path: "/customers" },
  { icon: Truck, label: "ספקים", path: "/suppliers" },
  { icon: Package, label: "מוצרים", path: "/products" },
  { icon: BarChart3, label: "אנליטיקס", path: "/analytics" },
  { icon: Settings, label: "הגדרות", path: "/settings" },
];

// Employee has limited access - no settings, limited analytics
const employeeMenuItems = [
  { icon: LayoutDashboard, label: "לוח בקרה", path: "/dashboard" },
  { icon: FileText, label: "הצעות מחיר", path: "/quotes" },
  { icon: Clock, label: "ממתין לאישור לקוח", path: "/pending-approval" },
  { icon: CheckCircle, label: "אושר על ידי הלקוח", path: "/customer-approved" },
  { icon: Briefcase, label: "עבודות בביצוע", path: "/jobs" },
  { icon: PackageCheck, label: "ממתין לאיסוף", path: "/ready-for-pickup" },
  { icon: Truck, label: "נאסף", path: "/picked-up" },
  { icon: Archive, label: "נמסר", path: "/delivered" },
  { icon: Users, label: "לקוחות", path: "/customers" },
  { icon: Truck, label: "ספקים", path: "/suppliers" },
  { icon: Package, label: "מוצרים", path: "/products" },
];

// Customer portal - only their quotes
const customerMenuItems = [
  { icon: ShoppingBag, label: "הצעות המחיר שלי", path: "/customer-portal" },
];

// Supplier portal - their products and prices
const supplierMenuItems = [
  { icon: Package, label: "פורטל ספקים", path: "/supplier-portal" },
];

// Courier portal - deliveries
const courierMenuItems = [
  { icon: Truck, label: "פורטל שליחים", path: "/courier-portal" },
];

const SIDEBAR_WIDTH = 256;
const SIDEBAR_COLLAPSED_WIDTH = 64;

// Role display names in Hebrew
const roleDisplayNames: Record<string, string> = {
  admin: 'מנהל מערכת',
  employee: 'עובד',
  customer: 'לקוח',
  supplier: 'ספק',
  courier: 'שליח',
};

// Role badge colors
const roleBadgeColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 border-red-200',
  employee: 'bg-blue-100 text-blue-800 border-blue-200',
  customer: 'bg-green-100 text-green-800 border-green-200',
  supplier: 'bg-purple-100 text-purple-800 border-purple-200',
  courier: 'bg-orange-100 text-orange-800 border-orange-200',
};

/**
 * DashboardLayout - תבנית הדאשבורד הראשית
 * 
 * SECURITY NOTE: רכיב זה מניח שהמשתמש כבר עבר אימות דרך ProtectedRoute.
 * אין להשתמש ברכיב זה ישירות ללא עטיפה ב-ProtectedRoute.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated, logout } = useAuthContext();
  
  const [location, setLocation] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const currentWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  // Fetch pending signups count for notification badge
  const { data: pendingSignups } = trpc.dashboard.pendingSignups.useQuery(undefined, {
    enabled: user?.role === 'admin' || user?.role === 'employee',
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  const pendingCount = pendingSignups?.length || 0;

  /**
   * Get menu items based on user role
   * SECURITY: Returns empty array for unknown roles to prevent unauthorized access
   */
  const getMenuItems = (userRole: string | undefined) => {
    switch (userRole) {
      case 'admin':
        return adminMenuItems;
      case 'employee':
        return employeeMenuItems;
      case 'customer':
        return customerMenuItems;
      case 'supplier':
        return supplierMenuItems;
      case 'courier':
        return courierMenuItems;
      default:
        // SECURITY: Unknown role gets no menu items
        console.warn(`Unknown user role: ${userRole}`);
        return [];
    }
  };

  // Logout function
  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  // Close mobile menu on navigation
  useEffect(() => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [location, isMobile]);

  // Show loading while checking auth
  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  // SECURITY: If no authenticated user, don't render the dashboard
  // This is a fallback - ProtectedRoute should handle this case
  if (!isAuthenticated || !user) {
    console.error('DashboardLayout: Attempted to render without authenticated user');
    setLocation('/');
    return null;
  }

  // Get menu items for the current user
  const menuItems = getMenuItems(user.role);

  // If no menu items available, user has no access
  if (menuItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            אין גישה
          </h1>
          <p className="text-gray-600 mb-6">
            לחשבון שלך אין הרשאות גישה למערכת. פנה למנהל המערכת.
          </p>
          <Button onClick={handleLogout} className="w-full">
            התנתק
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Fixed Sidebar - Desktop */}
      {!isMobile && (
        <aside
          className={cn(
            "fixed top-0 right-0 h-screen bg-sidebar border-l border-border z-40 transition-all duration-300 ease-in-out flex flex-col"
          )}
          style={{ width: currentWidth }}
        >
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            {!isCollapsed && (
              <span className="font-semibold text-lg tracking-tight">QuoteFlow</span>
            )}
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              {pendingCount > 0 && (
                <button
                  onClick={() => setLocation('/dashboard')}
                  className="relative h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors"
                  aria-label="התראות"
                >
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                    {pendingCount}
                  </span>
                </button>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors"
                aria-label="Toggle sidebar"
              >
                <PanelRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isCollapsed && "rotate-180")} />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-2 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => setLocation(item.path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-right",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Section */}
          <div className="p-3 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors w-full",
                  isCollapsed && "justify-center"
                )}>
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user.name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-sm font-medium truncate leading-none">
                        {user.name || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {user.email || "-"}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <Badge 
                    variant="outline" 
                    className={cn("mt-2 text-xs", roleBadgeColors[user.role] || 'bg-gray-100')}
                  >
                    {roleDisplayNames[user.role] || user.role}
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="ml-2 h-4 w-4" />
                  <span>התנתקות</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 right-0 left-0 h-14 bg-background/95 backdrop-blur border-b border-border z-50 flex items-center justify-between px-4">
          <span className="font-semibold">QuoteFlow</span>
          <div className="flex items-center gap-2">
            {/* Notification Bell - Mobile */}
            {pendingCount > 0 && (
              <button
                onClick={() => { setLocation('/dashboard'); setIsMobileMenuOpen(false); }}
                className="relative h-9 w-9 flex items-center justify-center hover:bg-accent rounded-lg"
                aria-label="התראות"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                  {pendingCount}
                </span>
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="h-9 w-9 flex items-center justify-center hover:bg-accent rounded-lg"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>
      )}

      {/* Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="fixed top-14 right-0 bottom-0 w-64 bg-sidebar border-l border-border z-50 flex flex-col animate-in slide-in-from-right">
            <nav className="flex-1 py-4 px-2 overflow-y-auto">
              <ul className="space-y-1">
                {menuItems.map(item => {
                  const isActive = location === item.path;
                  return (
                    <li key={item.path}>
                      <button
                        onClick={() => {
                          setLocation(item.path);
                          setIsMobileMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-right",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-3 px-2 py-2">
                <Avatar className="h-9 w-9 border shrink-0">
                  <AvatarFallback className="text-xs font-medium">
                    {user.name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-medium truncate leading-none">
                    {user.name || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {user.email || "-"}
                  </p>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={cn("mx-2 mb-2 text-xs", roleBadgeColors[user.role] || 'bg-gray-100')}
              >
                {roleDisplayNames[user.role] || user.role}
              </Badge>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start text-destructive hover:text-destructive mt-2"
              >
                <LogOut className="ml-2 h-4 w-4" />
                התנתקות
              </Button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out",
          isMobile ? "pt-14" : ""
        )}
        style={{
          marginRight: isMobile ? 0 : currentWidth,
        }}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
