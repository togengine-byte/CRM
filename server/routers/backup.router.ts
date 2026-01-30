/**
 * Backup Router
 * Handles backup and restore operations
 */

import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  createBackup,
  getBackupList,
  getBackupContent,
  deleteBackup,
  restoreFromBackup,
  getBackupSettings,
  saveBackupSettings,
  sendDailyBackupEmail,
} from "../db/backup";

export const backupRouter = router({
  // Get backup settings
  getSettings: adminProcedure
    .query(async () => {
      return await getBackupSettings();
    }),

  // Save backup settings
  saveSettings: adminProcedure
    .input(z.object({
      autoBackupEnabled: z.boolean().optional(),
      backupIntervalHours: z.number().min(1).max(24).optional(),
      maxBackups: z.number().min(10).max(100).optional(),
      emailBackupEnabled: z.boolean().optional(),
      adminEmail: z.string().email().optional().or(z.literal('')),
    }))
    .mutation(async ({ input }) => {
      const success = await saveBackupSettings(input);
      return { success };
    }),

  // Get list of backups
  list: adminProcedure
    .query(async () => {
      return await getBackupList();
    }),

  // Create new backup
  create: adminProcedure
    .mutation(async () => {
      return await createBackup();
    }),

  // Download backup content
  download: adminProcedure
    .input(z.object({
      filename: z.string(),
    }))
    .query(async ({ input }) => {
      const content = await getBackupContent(input.filename);
      return { content };
    }),

  // Delete backup
  delete: adminProcedure
    .input(z.object({
      filename: z.string(),
    }))
    .mutation(async ({ input }) => {
      const success = await deleteBackup(input.filename);
      return { success };
    }),

  // Restore from backup
  restore: adminProcedure
    .input(z.object({
      backupData: z.string(),
    }))
    .mutation(async ({ input }) => {
      return await restoreFromBackup(input.backupData);
    }),

  // Send backup email now
  sendEmailNow: adminProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      return await sendDailyBackupEmail(input.email);
    }),
});
