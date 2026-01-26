/**
 * Staff Router
 * Handles staff management - employees, suppliers, couriers
 */

import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  getAllStaff,
  getUserById,
  createStaffUser,
  updateStaffUser,
  updateUserPermissions,
  updateUserRole,
  deleteStaffUser,
  DEFAULT_PERMISSIONS,
} from "../db";

export const staffRouter = router({
  // Get all staff (employees, suppliers, couriers)
  list: adminProcedure
    .query(async () => {
      return await getAllStaff();
    }),

  // Get single user by ID
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getUserById(input.id);
    }),

  // Create new staff user
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1, "שם חובה"),
      email: z.string().email("כתובת מייל לא תקינה"),
      password: z.string().min(4, "סיסמה חייבת להכיל לפחות 4 תווים"),
      phone: z.string().optional(),
      companyName: z.string().optional(),
      role: z.enum(['employee', 'supplier', 'courier']),
      permissions: z.object({
        canViewDashboard: z.boolean().optional(),
        canManageQuotes: z.boolean().optional(),
        canViewCustomers: z.boolean().optional(),
        canEditCustomers: z.boolean().optional(),
        canViewSuppliers: z.boolean().optional(),
        canEditSuppliers: z.boolean().optional(),
        canViewProducts: z.boolean().optional(),
        canEditProducts: z.boolean().optional(),
        canViewAnalytics: z.boolean().optional(),
        canManageSettings: z.boolean().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await createStaffUser(input, ctx.user.id);
    }),

  // Update staff user details
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      companyName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return await updateStaffUser(id, data, ctx.user.id);
    }),

  // Update user permissions
  updatePermissions: adminProcedure
    .input(z.object({
      userId: z.number(),
      permissions: z.object({
        canViewDashboard: z.boolean().optional(),
        canManageQuotes: z.boolean().optional(),
        canViewCustomers: z.boolean().optional(),
        canEditCustomers: z.boolean().optional(),
        canViewSuppliers: z.boolean().optional(),
        canEditSuppliers: z.boolean().optional(),
        canViewProducts: z.boolean().optional(),
        canEditProducts: z.boolean().optional(),
        canViewAnalytics: z.boolean().optional(),
        canManageSettings: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      return await updateUserPermissions(input.userId, input.permissions, ctx.user.id);
    }),

  // Update user role
  updateRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(['employee', 'supplier', 'courier', 'admin']),
    }))
    .mutation(async ({ ctx, input }) => {
      return await updateUserRole(input.userId, input.role, ctx.user.id);
    }),

  // Delete (deactivate) staff user
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await deleteStaffUser(input.id, ctx.user.id);
    }),

  // Get default permissions for a role
  defaultPermissions: adminProcedure
    .input(z.object({ role: z.string() }))
    .query(async ({ input }) => {
      return DEFAULT_PERMISSIONS[input.role as keyof typeof DEFAULT_PERMISSIONS] || {};
    }),
});
