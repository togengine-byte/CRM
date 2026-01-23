import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Quotes from "./pages/Quotes";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Products from "./pages/Products";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Activity from "./pages/Activity";
import Jobs from "./pages/Jobs";
import LandingPage from "./pages/LandingPage";
import SupplierPortal from "./pages/SupplierPortal";
import CustomerPortal from "./pages/CustomerPortal";
import CourierPortal from "./pages/CourierPortal";
import CustomerSignup from "./pages/CustomerSignup";
import AdminSetup from "./pages/AdminSetup";

/**
 * Router Component
 * 
 * SECURITY: כל נתיב מוגן מוגדר עם הרשאות ספציפיות:
 * - requiredRole: תפקיד נדרש לגישה (יכול להיות מערך של תפקידים)
 * - admin תמיד יכול לגשת לכל נתיב
 * 
 * תפקידים זמינים: admin, employee, customer, supplier, courier
 */
function Router() {
  return (
    <Switch>
      {/* ========== Public routes - ללא צורך באימות ========== */}
      <Route path="/" component={LandingPage} />
      <Route path="/signup" component={CustomerSignup} />
      <Route path="/admin-setup" component={AdminSetup} />
      
      {/* ========== Admin & Employee routes - ניהול המערכת ========== */}
      
      {/* Dashboard - זמין לאדמין ועובדים */}
      <Route path="/dashboard">
        <ProtectedRoute requiredRole={['admin', 'employee']}>
          <DashboardLayout>
            <Home />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Quotes - ניהול הצעות מחיר - זמין לאדמין ועובדים */}
      <Route path="/quotes">
        <ProtectedRoute requiredRole={['admin', 'employee']}>
          <DashboardLayout>
            <Quotes />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Customers - ניהול לקוחות - זמין לאדמין ועובדים */}
      <Route path="/customers">
        <ProtectedRoute requiredRole={['admin', 'employee']}>
          <DashboardLayout>
            <Customers />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Suppliers - ניהול ספקים - זמין לאדמין ועובדים */}
      <Route path="/suppliers">
        <ProtectedRoute requiredRole={['admin', 'employee']}>
          <DashboardLayout>
            <Suppliers />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Products - ניהול מוצרים - זמין לאדמין ועובדים */}
      <Route path="/products">
        <ProtectedRoute requiredRole={['admin', 'employee']}>
          <DashboardLayout>
            <Products />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Jobs - עבודות בביצוע - זמין לאדמין ועובדים */}
      <Route path="/jobs">
        <ProtectedRoute requiredRole={['admin', 'employee']}>
          <DashboardLayout>
            <Jobs />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Analytics - אנליטיקס - זמין לאדמין בלבד */}
      <Route path="/analytics">
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <Analytics />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Activity - יומן פעילות - זמין לאדמין ועובדים */}
      <Route path="/activity">
        <ProtectedRoute requiredRole={['admin', 'employee']}>
          <DashboardLayout>
            <Activity />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Settings - הגדרות מערכת - זמין לאדמין בלבד */}
      <Route path="/settings">
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout>
            <Settings />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      {/* ========== Portal routes - פורטלים לסוגי משתמשים שונים ========== */}
      
      {/* Supplier Portal - זמין לספקים בלבד */}
      <Route path="/supplier-portal">
        <ProtectedRoute requiredRole="supplier">
          <DashboardLayout>
            <SupplierPortal />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Customer Portal - זמין ללקוחות בלבד */}
      <Route path="/customer-portal">
        <ProtectedRoute requiredRole="customer">
          <DashboardLayout>
            <CustomerPortal />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Courier Portal - זמין לשליחים בלבד */}
      <Route path="/courier-portal">
        <ProtectedRoute requiredRole="courier">
          <DashboardLayout>
            <CourierPortal />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      
      {/* ========== Error routes ========== */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
