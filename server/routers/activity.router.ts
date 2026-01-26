/**
 * Activity Router
 * Handles activity log listing and filtering
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getFilteredActivity, getActivityActionTypes } from "../db";

export const activityRouter = router({
  list: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
      customerName: z.string().optional(),
      employeeName: z.string().optional(),
      actionType: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getFilteredActivity(input || {});
    }),

  actionTypes: protectedProcedure.query(async () => {
    return await getActivityActionTypes();
  }),
});
