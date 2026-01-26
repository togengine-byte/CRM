/**
 * Notes Router
 * Handles internal notes for customers and quotes
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createNote, getNotes, deleteNote } from "../db";

export const notesRouter = router({
  list: protectedProcedure
    .input(z.object({
      targetType: z.enum(['customer', 'quote']),
      targetId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can view internal notes");
      }
      return await getNotes(input.targetType, input.targetId);
    }),

  create: protectedProcedure
    .input(z.object({
      targetType: z.enum(['customer', 'quote']),
      targetId: z.number(),
      content: z.string().min(1, "Content is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can create internal notes");
      }
      return await createNote({
        userId: ctx.user.id,
        targetType: input.targetType,
        targetId: input.targetId,
        content: input.content,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ noteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
        throw new Error("Only employees can delete internal notes");
      }
      // Pass user role for ownership verification in deleteNote
      return await deleteNote(input.noteId, ctx.user.id, ctx.user.role);
    }),
});
