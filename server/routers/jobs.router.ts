/**
 * Jobs Router
 * Handles job listing and status updates
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getActiveJobs, getJobsReadyForPickup, updateJobStatus, sendJobStatusEmail, getSupplierJobById } from "../db";

export const jobsRouter = router({
  // Get all active jobs
  list: protectedProcedure.query(async () => {
    return await getActiveJobs();
  }),

  // Get jobs ready for pickup
  readyForPickup: protectedProcedure.query(async () => {
    return await getJobsReadyForPickup();
  }),

  // Update job status
  updateStatus: protectedProcedure
    .input(z.object({
      jobId: z.number(),
      status: z.enum(['pending', 'in_progress', 'ready', 'picked_up', 'delivered']),
      notifyCustomer: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await updateJobStatus(input.jobId, input.status, ctx.user?.id);
      
      // Send email notification if requested
      if (input.notifyCustomer) {
        try {
          // Get job details for email
          const job = await getSupplierJobById(input.jobId);
          if (job && job.customer?.email) {
            await sendJobStatusEmail(
              job.customer.email,
              job.customer.name || 'לקוח יקר',
              input.jobId,
              job.productName || 'מוצר',
              input.status,
              ctx.user?.id
            );
          }
        } catch (error) {
          console.error(`[Email] Failed to send status update email for job ${input.jobId}:`, error);
        }
      }
      
      return result;
    }),
});
