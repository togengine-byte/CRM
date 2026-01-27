/**
 * Settings Router
 * Handles system settings like supplier weights, email preferences, and Gmail configuration
 */

import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import {
  getSupplierWeights,
  updateSupplierWeights,
  getEmailOnStatusChangeSetting,
  setEmailOnStatusChangeSetting,
  type EmailOnStatusChange,
  getGmailSettings,
  setGmailSettings,
  clearGmailSettings,
  testGmailConnection,
  sendEmail,
} from "../db";

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

  // Gmail Settings
  gmail: router({
    get: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await getGmailSettings();
      }),

    save: adminProcedure
      .input(z.object({
        email: z.string().email("כתובת מייל לא תקינה"),
        appPassword: z.string().min(16, "App Password חייב להיות 16 תווים").max(19, "App Password חייב להיות 16 תווים"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await setGmailSettings(input.email, input.appPassword, ctx.user.id);
      }),

    clear: adminProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await clearGmailSettings(ctx.user.id);
      }),

    test: adminProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await testGmailConnection();
      }),

    sendTestEmail: adminProcedure
      .input(z.object({
        to: z.string().email("כתובת מייל לא תקינה"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return await sendEmail({
          to: input.to,
          subject: "בדיקת מערכת מייל CRM",
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif;">
              <h2>בדיקת מערכת מייל</h2>
              <p>אם קיבלת מייל זה, הגדרות ה-Gmail פועלות כראוי!</p>
              <p>נשלח מ-CRM System</p>
            </div>
          `,
        }, ctx.user.id);
      }),
  }),

  // Send email to customer (for manual email sending)
  sendEmail: adminProcedure
    .input(z.object({
      to: z.string().email("כתובת מייל לא תקינה"),
      subject: z.string().min(1, "נושא נדרש"),
      body: z.string().min(1, "תוכן נדרש"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");
      return await sendEmail({
        to: input.to,
        subject: input.subject,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif;">
            ${input.body.replace(/\n/g, '<br/>')}
          </div>
        `,
      }, ctx.user.id);
    }),
});
