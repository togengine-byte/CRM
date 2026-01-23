import { useAuthContext } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelRight, Users, FileText, Truck, Package, BarChart3, Settings, Menu, X, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { DebugPanel } from "./DebugPanel";

const adminMenuItems = [
  { icon: LayoutDashboard, label: "לוח בקרה", path: "/dashboard" },
  { icon: FileText, label: "הצעות מחיר", path: "/quotes" },
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
  { icon: Users, label: "לקוחות", path: "/customers" },
  { icon: Truck, label: "ספקים", path: "/suppliers" },
  { icon: Package, label: "מוצרים", path: "/products" },
];

const customerMenuItems = [
  { icon: ShoppingBag, label: "הצעות המחיר שלי", path: "/customer-portal" },
];

const supplierMenuItems = [
  { icon: Package, label: "פורטל ספקים", path: "/supplier-portal" },
];

const courierMenuItems = [
  { icon: Truck, label: "פורטל שליחים", path: "/courier-portal" },
];

const SIDEBAR_WIDTH = 256;
const SIDEBAR_COLLAPSED_WIDTH = 64;

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

  // Select menu items based on user role
  const getMenuItems = (userRole: string | undefined) => {
    if (!userRole) return adminMenuItems;
    switch (userRole) {
      case 'customer':
        return customerMenuItems;
      case 'supplier':
        return supplierMenuItems;
      case 'courier':
        return courierMenuItems;
      case 'employee':
        return employeeMenuItems;
      case 'admin':
        return adminMenuItems;
      default:
        return adminMenuItems; // Default to admin access
    }
  };


  // Logout function
  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  useEffect(() => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [location, isMobile]);

  // Show loading while checking auth
  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  // Create a default guest user for unauthenticated access
  const displayUser = user || {
    name: 'אורח',
    email: '',
    role: 'admin' as const,
  };

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
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              <PanelRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isCollapsed && "rotate-180")} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-2 overflow-y-auto">
            <ul className="space-y-1">
              {getMenuItems(displayUser.role).map((item: typeof adminMenuItems[0]) => {
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
                      {displayUser.name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-sm font-medium truncate leading-none">
                        {displayUser.name || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {displayUser.email || "-"}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="h-9 w-9 flex items-center justify-center hover:bg-accent rounded-lg"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
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
                {getMenuItems(displayUser.role).map(item => {
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
                    {displayUser.name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-medium truncate leading-none">
                    {displayUser.name || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {displayUser.email || "-"}
                  </p>
                </div>
              </div>
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

      {/* Debug Panel */}
      <DebugPanel />
    </div>
  );
}
