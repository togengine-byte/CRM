/**
 * Settings Module
 * 
 * System settings management functions including
 * email settings, validation settings, and general configuration.
 */

import { getDb, eq, sql } from "./connection";
import { systemSettings } from "../../drizzle/schema";
import { logActivity } from "./activity";
import { EmailOnStatusChange } from "./types";

// ==================== SYSTEM SETTINGS ====================

/**
 * Get system setting by key
 */
export async function getSystemSetting(key: string) {
  const db = await getDb();
  if (!db) return null;

  const [setting] = await db.select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  return setting?.value || null;
}

/**
 * Set system setting
 */
export async function setSystemSetting(key: string, value: any, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(systemSettings).values({
      key,
      value,
      updatedBy: userId || null,
    });
  } else {
    await db.update(systemSettings)
      .set({ 
        value,
        updatedBy: userId || null,
      })
      .where(eq(systemSettings.key, key));
  }

  await logActivity(userId || null, "system_setting_updated", { key, value });

  return { success: true };
}

/**
 * Get all system settings
 */
export async function getAllSystemSettings() {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(systemSettings)
    .orderBy(systemSettings.key);
}

// ==================== EMAIL SETTINGS ====================

/**
 * Get email on status change setting
 */
export async function getEmailOnStatusChange(): Promise<EmailOnStatusChange> {
  const value = await getSystemSetting('email_on_status_change');
  return (value as EmailOnStatusChange) || 'ask';
}

/**
 * Set email on status change setting
 */
export async function setEmailOnStatusChange(value: EmailOnStatusChange, userId: number) {
  if (!['ask', 'auto', 'never'].includes(value)) {
    throw new Error("Invalid email setting value");
  }
  return await setSystemSetting('email_on_status_change', value, userId);
}

// ==================== VALIDATION SETTINGS ====================

export interface FileValidationSettings {
  minDpi: number;
  requiredColorspace: string;
  maxFileSizeMb: number;
  allowedFormats: string[];
  requireBleed: boolean;
  bleedSizeMm: number;
}

/**
 * Get file validation settings
 */
export async function getFileValidationSettings(): Promise<FileValidationSettings> {
  const settings = await getSystemSetting('file_validation') as FileValidationSettings | null;
  return settings || {
    minDpi: 300,
    requiredColorspace: 'CMYK',
    maxFileSizeMb: 100,
    allowedFormats: ['pdf', 'ai', 'eps', 'psd', 'tiff'],
    requireBleed: true,
    bleedSizeMm: 3,
  };
}

/**
 * Set file validation settings
 */
export async function setFileValidationSettings(settings: {
  minDpi?: number;
  requiredColorspace?: string;
  maxFileSizeMb?: number;
  allowedFormats?: string[];
  requireBleed?: boolean;
  bleedSizeMm?: number;
}, userId: number) {
  const current = await getFileValidationSettings();
  const updated = { ...current, ...settings };
  return await setSystemSetting('file_validation', updated, userId);
}

// ==================== BUSINESS SETTINGS ====================

/**
 * Get business info settings
 */
export async function getBusinessInfo() {
  const settings = await getSystemSetting('business_info');
  return settings || {
    name: '',
    address: '',
    phone: '',
    email: '',
    taxId: '',
    logo: null,
  };
}

/**
 * Set business info settings
 */
export async function setBusinessInfo(info: {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  logo?: string | null;
}, userId: number) {
  const current = await getBusinessInfo();
  const updated = { ...current, ...info };
  return await setSystemSetting('business_info', updated, userId);
}

/**
 * Get quote settings
 */
export async function getQuoteSettings() {
  const settings = await getSystemSetting('quote_settings');
  return settings || {
    validityDays: 30,
    defaultPaymentTerms: 'שוטף + 30',
    autoNumbering: true,
    numberPrefix: 'Q',
    termsAndConditions: '',
  };
}

/**
 * Set quote settings
 */
export async function setQuoteSettings(settings: {
  validityDays?: number;
  defaultPaymentTerms?: string;
  autoNumbering?: boolean;
  numberPrefix?: string;
  termsAndConditions?: string;
}, userId: number) {
  const current = await getQuoteSettings();
  const updated = { ...current, ...settings };
  return await setSystemSetting('quote_settings', updated, userId);
}

// ==================== NOTIFICATION SETTINGS ====================

/**
 * Get notification settings
 */
export async function getNotificationSettings() {
  const settings = await getSystemSetting('notifications');
  return settings || {
    emailOnNewQuote: true,
    emailOnQuoteApproved: true,
    emailOnQuoteRejected: true,
    emailOnJobReady: true,
    emailOnDelivery: true,
    smsEnabled: false,
    smsOnUrgent: false,
  };
}

/**
 * Set notification settings
 */
export async function setNotificationSettings(settings: {
  emailOnNewQuote?: boolean;
  emailOnQuoteApproved?: boolean;
  emailOnQuoteRejected?: boolean;
  emailOnJobReady?: boolean;
  emailOnDelivery?: boolean;
  smsEnabled?: boolean;
  smsOnUrgent?: boolean;
}, userId: number) {
  const current = await getNotificationSettings();
  const updated = { ...current, ...settings };
  return await setSystemSetting('notifications', updated, userId);
}


// ==================== EMAIL ON STATUS CHANGE ====================

export type EmailOnStatusChangeSetting = 'ask' | 'auto' | 'never';

/**
 * Get email on status change setting
 */
export async function getEmailOnStatusChangeSetting(): Promise<EmailOnStatusChangeSetting> {
  const db = await getDb();
  if (!db) return 'ask';

  const result = await db.select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'email_on_status_change'))
    .limit(1);

  if (result.length === 0) {
    return 'ask';
  }

  const value = result[0].value as string;
  if (value === 'auto' || value === 'never' || value === 'ask') {
    return value;
  }
  return 'ask';
}

/**
 * Set email on status change setting
 */
export async function setEmailOnStatusChangeSetting(value: EmailOnStatusChangeSetting, updatedBy?: number): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select()
    .from(systemSettings)
    .where(eq(systemSettings.key, 'email_on_status_change'))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(systemSettings).values({
      key: 'email_on_status_change',
      value: value,
      description: 'התנהגות שליחת מייל בשינוי סטטוס: ask (לשאול), auto (אוטומטי), never (לא לשלוח)',
      updatedBy,
    });
  } else {
    await db.update(systemSettings)
      .set({ 
        value: value,
        updatedBy,
      })
      .where(eq(systemSettings.key, 'email_on_status_change'));
  }

  return { success: true };
}


// ==================== GMAIL SETTINGS ====================

export interface GmailSettings {
  email: string;
  appPassword: string;
  isConfigured: boolean;
}

/**
 * Get Gmail settings (returns masked password for display)
 */
export async function getGmailSettings(): Promise<{ email: string; isConfigured: boolean; maskedPassword: string }> {
  const settings = await getSystemSetting('gmail_settings') as GmailSettings | null;
  
  if (!settings || !settings.email || !settings.appPassword) {
    return {
      email: '',
      isConfigured: false,
      maskedPassword: '',
    };
  }
  
  return {
    email: settings.email,
    isConfigured: true,
    maskedPassword: '●'.repeat(16), // Always show 16 dots for security
  };
}

/**
 * Get Gmail settings with full password (for internal use only - sending emails)
 */
export async function getGmailSettingsInternal(): Promise<GmailSettings | null> {
  const settings = await getSystemSetting('gmail_settings') as GmailSettings | null;
  
  if (!settings || !settings.email || !settings.appPassword) {
    return null;
  }
  
  return settings;
}

/**
 * Set Gmail settings
 */
export async function setGmailSettings(email: string, appPassword: string, userId: number): Promise<{ success: boolean }> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("כתובת מייל לא תקינה");
  }
  
  // Validate app password (should be 16 characters without spaces)
  const cleanPassword = appPassword.replace(/\s/g, '');
  if (cleanPassword.length !== 16) {
    throw new Error("App Password חייב להיות 16 תווים");
  }
  
  const settings: GmailSettings = {
    email: email.toLowerCase().trim(),
    appPassword: cleanPassword,
    isConfigured: true,
  };
  
  await setSystemSetting('gmail_settings', settings, userId);
  
  await logActivity(userId, "gmail_settings_updated", { email: settings.email });
  
  return { success: true };
}

/**
 * Clear Gmail settings
 */
export async function clearGmailSettings(userId: number): Promise<{ success: boolean }> {
  await setSystemSetting('gmail_settings', { email: '', appPassword: '', isConfigured: false }, userId);
  await logActivity(userId, "gmail_settings_cleared", {});
  return { success: true };
}
