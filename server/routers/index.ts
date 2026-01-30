/**
 * Main Router Index
 * Combines all domain routers into the main appRouter
 */

import { router } from "../_core/trpc";
import { systemRouter } from "../_core/systemRouter";
import { supplierPortalRouter } from "../supplierPortal";
import { customerPortalRouter } from "../customerPortal";

// Import all domain routers
import { authRouter } from "./auth.router";
import { dashboardRouter } from "./dashboard.router";
import { activityRouter } from "./activity.router";
import { productsRouter } from "./products.router";
import { quotesRouter } from "./quotes.router";
import { customersRouter } from "./customers.router";
import { suppliersRouter } from "./suppliers.router";
import { courierRouter } from "./courier.router";
import { notesRouter } from "./notes.router";
import { validationRouter } from "./validation.router";
import { analyticsRouter } from "./analytics.router";
import { settingsRouter } from "./settings.router";
import { userManagementRouter } from "./userManagement.router";
import { staffRouter } from "./staff.router";
import { jobsRouter } from "./jobs.router";
import { pricelistsRouter } from "./pricelists.router";
import { quotePricingRouter } from "./quotePricing.router";
import { adminRouter } from "./admin.router";
import { backupRouter } from "./backup.router";

/**
 * Main application router
 * All routes are organized by domain for better maintainability
 */
export const appRouter = router({
  // Core system routes
  system: systemRouter,
  
  // Portal routes (external)
  supplierPortal: supplierPortalRouter,
  customerPortal: customerPortalRouter,
  
  // Domain routes (internal)
  auth: authRouter,
  dashboard: dashboardRouter,
  activity: activityRouter,
  products: productsRouter,
  quotes: quotesRouter,
  admin: adminRouter,
  customers: customersRouter,
  suppliers: suppliersRouter,
  courier: courierRouter,
  notes: notesRouter,
  validation: validationRouter,
  analytics: analyticsRouter,
  settings: settingsRouter,
  userManagement: userManagementRouter,
  staff: staffRouter,
  jobs: jobsRouter,
  pricelists: pricelistsRouter,
  quotePricing: quotePricingRouter,
  backup: backupRouter,
});

export type AppRouter = typeof appRouter;
