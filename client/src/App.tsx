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
import LandingPage from "./pages/LandingPage";
import SupplierPortal from "./pages/SupplierPortal";
import CustomerPortal from "./pages/CustomerPortal";
import CourierPortal from "./pages/CourierPortal";
import CustomerSignup from "./pages/CustomerSignup";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/signup" component={CustomerSignup} />
      
      {/* Protected dashboard routes */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardLayout>
            <Home />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/quotes">
        <ProtectedRoute>
          <DashboardLayout>
            <Quotes />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/customers">
        <ProtectedRoute>
          <DashboardLayout>
            <Customers />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/suppliers">
        <ProtectedRoute>
          <DashboardLayout>
            <Suppliers />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/products">
        <ProtectedRoute>
          <DashboardLayout>
            <Products />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/analytics">
        <ProtectedRoute>
          <DashboardLayout>
            <Analytics />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/activity">
        <ProtectedRoute>
          <DashboardLayout>
            <Activity />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <DashboardLayout>
            <Settings />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/supplier-portal">
        <ProtectedRoute>
          <DashboardLayout>
            <SupplierPortal />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/customer-portal">
        <ProtectedRoute>
          <DashboardLayout>
            <CustomerPortal />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/courier-portal">
        <ProtectedRoute>
          <DashboardLayout>
            <CourierPortal />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
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
