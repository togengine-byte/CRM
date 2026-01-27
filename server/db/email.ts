/**
 * Email Module
 * 
 * Handles sending emails using Gmail SMTP with App Password
 */

import nodemailer from 'nodemailer';
import { getGmailSettingsInternal } from './settings';
import { logActivity } from './activity';

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

/**
 * Send email using configured Gmail settings
 */
export async function sendEmail(params: SendEmailParams, userId?: number): Promise<SendEmailResult> {
  try {
    console.log('[Email] Starting to send email to:', params.to);
    
    // Get Gmail settings
    const gmailSettings = await getGmailSettingsInternal();
    
    if (!gmailSettings || !gmailSettings.isConfigured) {
      console.log('[Email] Gmail not configured - email not sent');
      return {
        success: false,
        error: 'Gmail settings not configured. Please set email and app password in general settings.',
      };
    }
    
    console.log('[Email] Gmail settings found, creating transporter...');
    
    // Create transporter with timeout
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailSettings.email,
        pass: gmailSettings.appPassword,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    
    console.log('[Email] Sending email...');
    
    // Send email
    const info = await transporter.sendMail({
      from: `"CRM System" <${gmailSettings.email}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    
    // Log activity
    await logActivity(userId || null, 'email_sent', {
      to: params.to,
      subject: params.subject,
      messageId: info.messageId,
    });
    
    console.log(`[Email] Sent successfully to ${params.to}, messageId: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('[Email] Failed to send:', error.message);
    console.error('[Email] Full error:', error);
    
    // Log failed attempt
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
 * Test Gmail connection
 */
export async function testGmailConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Email] Testing Gmail connection...');
    
    const gmailSettings = await getGmailSettingsInternal();
    
    if (!gmailSettings || !gmailSettings.isConfigured) {
      return {
        success: false,
        error: 'Gmail settings not configured',
      };
    }
    
    console.log('[Email] Creating transporter for test...');
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailSettings.email,
        pass: gmailSettings.appPassword,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    
    console.log('[Email] Verifying connection...');
    
    // Verify connection with timeout
    await Promise.race([
      transporter.verify(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 15000)
      )
    ]);
    
    console.log('[Email] Connection verified successfully');
    
    return { success: true };
  } catch (error: any) {
    console.error('[Email] Connection test failed:', error.message);
    return {
      success: false,
      error: error.message || 'Error connecting to Gmail',
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
    <div dir="rtl" style="font-family: Arial, sans-serif;">
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
