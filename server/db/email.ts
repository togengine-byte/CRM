/**
 * Email Module
 * 
 * Handles sending emails using Gmail SMTP with App Password
 */

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
 * Get nodemailer dynamically to avoid build issues
 */
async function getNodemailer() {
  try {
    const nodemailer = await import('nodemailer');
    return nodemailer.default || nodemailer;
  } catch (error) {
    console.error('[Email] Failed to load nodemailer:', error);
    return null;
  }
}

/**
 * Send email using configured Gmail settings
 */
export async function sendEmail(params: SendEmailParams, userId?: number): Promise<SendEmailResult> {
  try {
    // Get Gmail settings
    const gmailSettings = await getGmailSettingsInternal();
    
    if (!gmailSettings || !gmailSettings.isConfigured) {
      console.log('[Email] Gmail not configured - email not sent');
      return {
        success: false,
        error: 'הגדרות Gmail לא הוגדרו. יש להגדיר מייל וסיסמת אפליקציה בהגדרות כלליות.',
      };
    }
    
    const nodemailer = await getNodemailer();
    if (!nodemailer) {
      return {
        success: false,
        error: 'שגיאה בטעינת מודול המייל',
      };
    }
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailSettings.email,
        pass: gmailSettings.appPassword,
      },
    });
    
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
    
    // Log failed attempt
    await logActivity(userId || null, 'email_failed', {
      to: params.to,
      subject: params.subject,
      error: error.message,
    });
    
    return {
      success: false,
      error: error.message || 'שגיאה בשליחת המייל',
    };
  }
}

/**
 * Test Gmail connection
 */
export async function testGmailConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const gmailSettings = await getGmailSettingsInternal();
    
    if (!gmailSettings || !gmailSettings.isConfigured) {
      return {
        success: false,
        error: 'הגדרות Gmail לא הוגדרו',
      };
    }
    
    const nodemailer = await getNodemailer();
    if (!nodemailer) {
      return {
        success: false,
        error: 'שגיאה בטעינת מודול המייל',
      };
    }
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailSettings.email,
        pass: gmailSettings.appPassword,
      },
    });
    
    // Verify connection
    await transporter.verify();
    
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'שגיאה בחיבור ל-Gmail',
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
  const subject = `הצעת מחיר מספר ${quoteNumber}`;
  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif;">
      <h2>שלום ${customerName},</h2>
      <p>מצורפת הצעת מחיר מספר <strong>${quoteNumber}</strong>.</p>
      <p>סה"כ: <strong>₪${quoteTotal.toLocaleString()}</strong></p>
      <p>להצגת ההצעה המלאה, אנא היכנס לפורטל הלקוחות.</p>
      <br/>
      <p>בברכה,<br/>צוות CRM</p>
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
    pending: 'ממתין',
    in_progress: 'בייצור',
    ready: 'מוכן לאיסוף',
    delivered: 'נמסר',
    cancelled: 'בוטל',
  };
  
  const subject = `עדכון סטטוס עבודה - ${productName}`;
  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif;">
      <h2>שלום ${customerName},</h2>
      <p>סטטוס העבודה שלך עודכן:</p>
      <p><strong>מוצר:</strong> ${productName}</p>
      <p><strong>סטטוס חדש:</strong> ${statusText[newStatus] || newStatus}</p>
      <br/>
      <p>בברכה,<br/>צוות CRM</p>
    </div>
  `;
  
  return await sendEmail({ to: customerEmail, subject, html }, userId);
}
