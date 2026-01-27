import { Permission } from "./types";

export const PERMISSION_LIST: Permission[] = [
  { key: 'canViewDashboard', label: 'צפייה בלוח בקרה', description: 'גישה לדף הבית ולוח הבקרה' },
  { key: 'canManageQuotes', label: 'ניהול הצעות מחיר', description: 'יצירה, עריכה ומחיקה של הצעות מחיר' },
  { key: 'canViewCustomers', label: 'צפייה בלקוחות', description: 'גישה לרשימת הלקוחות' },
  { key: 'canEditCustomers', label: 'עריכת לקוחות', description: 'עריכה ומחיקה של לקוחות' },
  { key: 'canViewSuppliers', label: 'צפייה בספקים', description: 'גישה לרשימת הספקים' },
  { key: 'canEditSuppliers', label: 'עריכת ספקים', description: 'עריכה ומחיקה של ספקים' },
  { key: 'canViewProducts', label: 'צפייה במוצרים', description: 'גישה לרשימת המוצרים' },
  { key: 'canEditProducts', label: 'עריכת מוצרים', description: 'עריכה ומחיקה של מוצרים' },
  { key: 'canViewAnalytics', label: 'צפייה באנליטיקס', description: 'גישה לדוחות וסטטיסטיקות' },
  { key: 'canManageSettings', label: 'ניהול הגדרות', description: 'גישה לדף ההגדרות' },
];

export const COLORSPACE_OPTIONS = ["CMYK", "RGB", "Grayscale", "LAB"];

export const FORMAT_OPTIONS = ["pdf", "ai", "eps", "tiff", "psd", "jpg", "png"];
