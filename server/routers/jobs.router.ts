/**
 * Jobs Router
 * Handles job listing and status updates
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getActiveJobs, getJobsReadyForPickup, updateJobStatus } from "../db";

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
        // TODO: Implement email sending when Gmail API key is configured
        console.log(`[Email] Would send status update email for job ${input.jobId} to customer`);
      }
      
      return result;
    }),
});
