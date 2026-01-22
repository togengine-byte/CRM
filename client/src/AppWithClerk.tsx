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
import ClerkLogin from "./pages/ClerkLogin";
import SupplierPortal from "./pages/SupplierPortal";
import CustomerPortal from "./pages/CustomerPortal";
import CourierPortal from "./pages/CourierPortal";
import CustomerSignup from "./pages/CustomerSignup";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={ClerkLogin} />
      <Route path="/signup" component={CustomerSignup} />
      <Route>
        <ProtectedRoute>
          <DashboardLayout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/quotes" component={Quotes} />
              <Route path="/customers" component={Customers} />
              <Route path="/suppliers" component={Suppliers} />
              <Route path="/products" component={Products} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/activity" component={Activity} />
              <Route path="/settings" component={Settings} />
              <Route path="/supplier-portal" component={SupplierPortal} />
              <Route path="/customer-portal" component={CustomerPortal} />
              <Route path="/courier-portal" component={CourierPortal} />
              <Route path="/404" component={NotFound} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        </ProtectedRoute>
      </Route>
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
