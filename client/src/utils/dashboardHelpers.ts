// Dashboard utility functions

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('he-IL').format(value);
}

export function formatTime(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

export function formatShortDate(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

export function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Helper to check if job is overdue
export function isJobOverdue(job: any): boolean {
  if (!job.createdAt || !job.promisedDeliveryDays) return false;
  const createdDate = new Date(job.createdAt);
  const promisedDate = new Date(createdDate.getTime() + job.promisedDeliveryDays * 24 * 60 * 60 * 1000);
  return new Date() > promisedDate;
}

// Helper to get detailed issue description based on job status
export function getJobIssueDescription(job: any): string {
  const status = job.status;
  
  switch (status) {
    case 'pending':
      return 'אושר על ידי הלקוח אך הספק עדיין לא אישר קבלת העבודה - היה צריך כבר למסור ללקוח';
    case 'in_progress':
    case 'in_production':
    case 'accepted':
      return 'הספק לא אישר סיום עבודה - היה צריך כבר למסור ללקוח';
    case 'ready':
      return 'מוכן לאיסוף אך עדיין לא נאסף - היה צריך כבר למסור ללקוח';
    case 'picked_up':
      return 'נאסף אך עדיין לא נמסר ללקוח';
    default:
      return 'עבר את מועד האספקה';
  }
}

// Helper to get current stage label in Hebrew
export function getCurrentStageLabel(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'אושר על ידי הלקוח',
    'in_progress': 'עבודות בביצוע',
    'in_production': 'עבודות בביצוע',
    'accepted': 'עבודות בביצוע',
    'ready': 'ממתין לאיסוף',
    'picked_up': 'נאסף',
    'delivered': 'נמסר',
  };
  return statusMap[status] || status;
}

// Helper to get status label in Hebrew
export function getStatusLabel(status: string): string {
  return getCurrentStageLabel(status);
}

// בדיקת איחור להצעות מחיר
export function isQuoteOverdue(quote: any): { overdue: boolean; issue: string } {
  if (!quote.createdAt) return { overdue: false, issue: '' };
  
  const createdDate = new Date(quote.createdAt);
  const now = new Date();
  const hoursSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60));
  const daysSinceCreation = Math.floor(hoursSinceCreation / 24);
  
  // נשלחה יותר מ-24 שעות - ממתינה לאישור
  if (quote.status === 'sent' && hoursSinceCreation > 24) {
    const timeText = daysSinceCreation > 0 
      ? `${daysSinceCreation} ימים` 
      : `${hoursSinceCreation} שעות`;
    return { overdue: true, issue: `ממתינה לאישור לקוח כבר ${timeText}` };
  }
  
  return { overdue: false, issue: '' };
}

// Helper to generate WhatsApp message for overdue quotes
// productsList format: "250 כרטיסי ביקור" or "250 כרטיסי ביקור ו-5 רולאפים"
export function getQuoteWhatsAppMessage(
  quoteId: number, 
  productsList: string, 
  price: number,
  senderName: string
): string {
  const formattedPrice = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
  }).format(price);
  
  return `שלום, יש לכם אצלנו הצעת מחיר מספר ${quoteId} של ${productsList} במחיר של ${formattedPrice}. איך אפשר לקדם אותה?\n${senderName}`;
}

// Helper to generate WhatsApp message based on job status
export function getWhatsAppMessage(jobId: number, productName: string, status: string): string {
  const baseMsg = `עבודה מספר ${jobId}`;
  
  switch (status) {
    case 'pending':
      return `${baseMsg} - ${productName}\nהעבודה עדיין לא אושרה על ידכם.\nאנא אשרו קבלת העבודה.`;
    case 'in_progress':
    case 'in_production':
    case 'accepted':
      return `${baseMsg} - ${productName}\nהעבודה עדיין לא בוצעה.\nהיה אמור כבר להיאסף.\nמה קורה עם זה?`;
    case 'ready':
      return `${baseMsg} - ${productName}\nהעבודה מוכנה לאיסוף.\nהשליח שלנו בדרך לאסוף.`;
    case 'picked_up':
      return `${baseMsg} - ${productName}\nהעבודה נאספה אך עדיין לא נמסרה ללקוח.`;
    default:
      return `${baseMsg} - ${productName}\nאנא עדכנו לגבי מצב העבודה.`;
  }
}

// Helper to create WhatsApp URL
export function createWhatsAppUrl(phone: string | undefined, message: string): string {
  if (!phone) return '';
  // ניקוי מספר טלפון - הסרת מקפים ותווים מיותרים
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  // אם מתחיל ב-0, מחליף ל-972
  const formattedPhone = cleanPhone.startsWith('0') 
    ? '972' + cleanPhone.substring(1) 
    : cleanPhone;
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

// Check if file is an image
export function isImageFile(filename: string): boolean {
  if (!filename) return false;
  const ext = filename.toLowerCase().split('.').pop();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '');
}

// Unified stages for progress bar
export const UNIFIED_STAGES = [
  { key: 'draft', label: 'הצעות מחיר', shortLabel: 'הצעות מחיר', phase: 'sales' },
  { key: 'sent', label: 'ממתין לאישור לקוח', shortLabel: 'ממתין לאישור לקוח', phase: 'sales' },
  { key: 'approved', label: 'אושר על ידי הלקוח', shortLabel: 'אושר על ידי הלקוח', phase: 'sales' },
  { key: 'in_production', label: 'עבודות בביצוע', shortLabel: 'עבודות בביצוע', phase: 'production' },
  { key: 'ready', label: 'ממתין לאיסוף', shortLabel: 'ממתין לאיסוף', phase: 'production' },
  { key: 'picked_up', label: 'נאסף', shortLabel: 'נאסף', phase: 'delivery' },
  { key: 'delivered', label: 'נמסר', shortLabel: 'נמסר', phase: 'delivery' },
] as const;

// ממיר סטטוס לאינדקס בפס המאוחד (7 שלבים: 0-6)
export function getUnifiedStageIndex(quoteStatus: string | null, jobStatus: string | null): number {
  // אם יש סטטוס עבודה, הוא קודם
  if (jobStatus) {
    switch (jobStatus) {
      case 'pending': return 3; // עבודות בביצוע (ממתין לספק)
      case 'in_progress':
      case 'in_production':
      case 'accepted': return 3; // עבודות בביצוע
      case 'ready': return 4; // ממתין לאיסוף
      case 'picked_up': return 5; // נאסף
      case 'delivered': return 6; // נמסר
      default: return 3;
    }
  }
  
  // אם רק סטטוס הצעה
  if (quoteStatus) {
    switch (quoteStatus) {
      case 'draft': return 0; // הצעות מחיר
      case 'sent': return 1; // ממתין לאישור לקוח
      case 'approved': return 2; // אושר על ידי הלקוח
      default: return 0;
    }
  }
  
  return 0;
}
