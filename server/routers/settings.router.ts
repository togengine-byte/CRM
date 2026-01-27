/**
 * Settings Router
 * Handles system settings like supplier weights, email preferences, and email configuration
 */

import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import {
  getSupplierWeights,
  updateSupplierWeights,
  getEmailOnStatusChangeSetting,
  setEmailOnStatusChangeSetting,
  type EmailOnStatusChange,
} from "../db";
import {
  getEmailSettings,
  saveEmailSettings,
  testEmailConnection,
  sendEmail,
} from "../db/email";

export const settingsRouter = router({
  supplierWeights: router({
    get: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await getSupplierWeights();
      }),

    update: adminProcedure
      .input(z.object({
        price: z.number().min(0).max(100),
        rating: z.number().min(0).max(100),
        deliveryTime: z.number().min(0).max(100),
        reliability: z.number().min(0).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await updateSupplierWeights(input, ctx.user.id);
      }),
  }),

  emailOnStatusChange: router({
    get: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await getEmailOnStatusChangeSetting();
      }),

    update: adminProcedure
      .input(z.object({
        value: z.enum(['ask', 'auto', 'never']),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await setEmailOnStatusChangeSetting(input.value as EmailOnStatusChange, ctx.user.id);
      }),
  }),

  // Email Settings (using Resend)
  gmail: router({
    get: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const settings = await getEmailSettings();
        return {
          email: settings?.fromEmail || '',
          isConfigured: settings?.isConfigured || true,
        };
      }),

    save: adminProcedure
      .input(z.object({
        email: z.string().email("Invalid email address"),
        appPassword: z.string().optional(), // Not needed for Resend but keep for compatibility
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const success = await saveEmailSettings({
          fromEmail: input.email,
          fromName: 'CRM System',
        });
        return { success };
      }),

    clear: adminProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const success = await saveEmailSettings({
          fromEmail: 'onboarding@resend.dev',
          fromName: 'CRM System',
        });
        return { success };
      }),

    test: adminProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await testEmailConnection();
      }),

    sendTestEmail: adminProcedure
      .input(z.object({
        to: z.string().email("Invalid email address"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await sendEmail({
          to: input.to,
          subject: "CRM Email System Test",
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2>Email System Test</h2>
              <p>If you received this email, the email settings are working correctly!</p>
              <p>Sent from CRM System</p>
            </div>
          `,
        }, ctx.user.id);
      }),
  }),

  // Send email to customer (for manual email sending)
  sendEmail: adminProcedure
    .input(z.object({
      to: z.string().email("Invalid email address"),
      subject: z.string().min(1, "Subject is required"),
      body: z.string().min(1, "Body is required"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await sendEmail({
        to: input.to,
        subject: input.subject,
        html: `
          <div style="font-family: Arial, sans-serif;">
            ${input.body.replace(/\n/g, '<br/>')}
          </div>
        `,
      }, ctx.user.id);
    }),
});
