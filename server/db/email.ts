/**
 * Email Module
 * 
 * Handles sending emails using Resend API
 */

import { Resend } from 'resend';
import { getSystemSetting, setSystemSetting } from './settings';
import { logActivity } from './activity';

// Resend API Key - stored in environment or settings
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_LDhrRfMj_KhY6idbhStyKkH5uPcdSfZKf';

export interface SendEmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailSettings {
  fromEmail: string;
  fromName: string;
  isConfigured: boolean;
}

/**
 * Get email settings from database
 */
export async function getEmailSettings(): Promise<EmailSettings | null> {
  try {
    const settings = await getSystemSetting('email_settings');
    if (settings && typeof settings === 'string') {
      const parsed = JSON.parse(settings);
      return {
        fromEmail: parsed.fromEmail || 'onboarding@resend.dev',
        fromName: parsed.fromName || 'CRM System',
        isConfigured: true,
      };
    }
    // Default settings
    return {
      fromEmail: 'onboarding@resend.dev',
      fromName: 'CRM System',
      isConfigured: true,
    };
  } catch (error) {
    console.error('[Email] Failed to get settings:', error);
    return {
      fromEmail: 'onboarding@resend.dev',
      fromName: 'CRM System',
      isConfigured: true,
    };
  }
}

/**
 * Save email settings to database
 */
export async function saveEmailSettings(settings: { fromEmail: string; fromName: string }): Promise<boolean> {
  try {
    await setSystemSetting('email_settings', JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('[Email] Failed to save settings:', error);
    return false;
  }
}

/**
 * Send email using Resend API
 */
export async function sendEmail(params: SendEmailParams, userId?: number): Promise<SendEmailResult> {
  try {
    console.log('[Email] Starting to send email to:', params.to);
    
    const settings = await getEmailSettings();
    const resend = new Resend(RESEND_API_KEY);
    
    console.log('[Email] Sending via Resend API...');
    
    const emailOptions: any = {
      from: `${settings?.fromName || 'CRM System'} <${settings?.fromEmail || 'onboarding@resend.dev'}>`,
      to: [params.to],
      subject: params.subject,
    };
    
    if (params.html) {
      emailOptions.html = params.html;
    }
    if (params.text) {
      emailOptions.text = params.text;
    }
    
    const { data, error } = await resend.emails.send(emailOptions);
    
    if (error) {
      console.error('[Email] Resend API error:', error);
      
      try {
        await logActivity(userId || null, 'email_failed', {
          to: params.to,
          subject: params.subject,
          error: error.message,
        });
      } catch (logError) {
        console.error('[Email] Failed to log activity:', logError);
      }
      
      return {
        success: false,
        error: error.message || 'Error sending email',
      };
    }
    
    // Log activity
    try {
      await logActivity(userId || null, 'email_sent', {
        to: params.to,
        subject: params.subject,
        messageId: data?.id,
      });
    } catch (logError) {
      console.error('[Email] Failed to log activity:', logError);
    }
    
    console.log(`[Email] Sent successfully to ${params.to}, messageId: ${data?.id}`);
    
    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error: any) {
    console.error('[Email] Failed to send:', error.message);
    console.error('[Email] Full error:', error);
    
    try {
      await logActivity(userId || null, 'email_failed', {
        to: params.to,
        subject: params.subject,
        error: error.message,
      });
    } catch (logError) {
      console.error('[Email] Failed to log activity:', logError);
    }
    
    return {
      success: false,
      error: error.message || 'Error sending email',
    };
  }
}

/**
 * Test email connection
 */
export async function testEmailConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Email] Testing Resend connection...');
    
    const resend = new Resend(RESEND_API_KEY);
    
    // Just verify the API key works by getting domains (lightweight call)
    const { error } = await resend.domains.list();
    
    if (error) {
      console.error('[Email] Resend API test failed:', error);
      return {
        success: false,
        error: error.message || 'API connection failed',
      };
    }
    
    console.log('[Email] Resend connection verified successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Connection test failed:', error.message);
    return {
      success: false,
      error: error.message || 'Error connecting to email service',
    };
  }
}

/**
 * Send quote to customer email
 */
export async function sendQuoteEmail(
  customerEmail: string,
  customerName: string,
  quoteNumber: number,
  quoteTotal: number,
  userId?: number
): Promise<SendEmailResult> {
  const subject = `Quote #${quoteNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>Hello ${customerName},</h2>
      <p>Please find attached quote number <strong>${quoteNumber}</strong>.</p>
      <p>Total: <strong>₪${quoteTotal.toLocaleString()}</strong></p>
      <p>To view the full quote, please log in to the customer portal.</p>
      <br/>
      <p>Best regards,<br/>CRM Team</p>
    </div>
  `;
  
  return await sendEmail({ to: customerEmail, subject, html }, userId);
}

/**
 * Send job status update email
 */
export async function sendJobStatusEmail(
  customerEmail: string,
  customerName: string,
  jobId: number,
  productName: string,
  newStatus: string,
  userId?: number
): Promise<SendEmailResult> {
  const statusText: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    ready: 'Ready for Pickup',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  
  const subject = `Job Status Update - ${productName}`;
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>Hello ${customerName},</h2>
      <p>Your job status has been updated:</p>
      <p><strong>Product:</strong> ${productName}</p>
      <p><strong>New Status:</strong> ${statusText[newStatus] || newStatus}</p>
      <br/>
      <p>Best regards,<br/>CRM Team</p>
    </div>
  `;
  
  return await sendEmail({ to: customerEmail, subject, html }, userId);
}

// Keep old function names for backward compatibility
export const getGmailSettingsInternal = getEmailSettings;
export const testGmailConnection = testEmailConnection;
