import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Quotes from "./pages/Quotes";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Products from "./pages/Products";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Activity from "./pages/Activity";
import Login from "./pages/Login";
import SupplierPortal from "./pages/SupplierPortal";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
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
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
