/**
 * Dashboard Router
 * Handles dashboard KPIs, recent activity, and overview data
 */

import { protectedProcedure, router } from "../_core/trpc";
import {
  getDashboardKPIs,
  getRecentActivity,
  getRecentQuotes,
  getPendingCustomers,
  getPendingSignups,
  getPendingApprovals,
  getActiveJobs,
  getJobsReadyForPickup,
  getUrgentAlerts,
  getNewQuoteRequests,
} from "../db";

export const dashboardRouter = router({
  kpis: protectedProcedure.query(async () => {
    return await getDashboardKPIs();
  }),
  
  recentActivity: protectedProcedure.query(async () => {
    return await getRecentActivity(10);
  }),
  
  recentQuotes: protectedProcedure.query(async () => {
    return await getRecentQuotes(5);
  }),
  
  pendingCustomers: protectedProcedure.query(async () => {
    return await getPendingCustomers(5);
  }),

  // New endpoints for pending signups and approvals
  pendingSignups: protectedProcedure.query(async () => {
    return await getPendingSignups(5);
  }),

  pendingApprovals: protectedProcedure.query(async () => {
    return await getPendingApprovals(5);
  }),

  // Active jobs for Jobs page
  activeJobs: protectedProcedure.query(async () => {
    return await getActiveJobs();
  }),

  // Jobs ready for courier pickup
  readyForPickup: protectedProcedure.query(async () => {
    return await getJobsReadyForPickup();
  }),

  // Urgent alerts for dashboard
  urgentAlerts: protectedProcedure.query(async () => {
    return await getUrgentAlerts();
  }),

  // New quote requests from landing page
  newQuoteRequests: protectedProcedure.query(async () => {
    return await getNewQuoteRequests(10);
  }),
});
