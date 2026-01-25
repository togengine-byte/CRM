# סקירת קוד - מערכת הצעות מחיר וביטול ספק

## 1. סכמת מסד נתונים

### טבלת quotes (הצעות מחיר)
- **סטטוסים קיימים:** draft, sent, approved, rejected, superseded, in_production, ready
- **שדות חשובים:**
  - `status` - סטטוס ההצעה
  - `pricelistId` - מחירון שהוחל
  - `finalValue` - סכום סופי ללקוח
  - `totalSupplierCost` - עלות ספק כוללת

### טבלת quoteItems (פריטים בהצעה)
- **שדות חשובים:**
  - `priceAtTimeOfQuote` - מחיר ללקוח
  - `isManualPrice` - האם מחיר ידני
  - `supplierId` - ספק שנבחר לפריט
  - `supplierCost` - עלות ספק

### טבלת supplierJobs (עבודות לספקים)
- **סטטוסים:** pending, ...
- **שדות חשובים:**
  - `supplierId` - הספק
  - `quoteId` - קישור להצעה
  - `quoteItemId` - קישור לפריט בהצעה
  - `status` - סטטוס העבודה
  - `supplierMarkedReady` - האם הספק סימן כמוכן

### הערות:
- **חסר:** שדה לסימון "בוטל" או "לא לבצע" ב-supplierJobs
- **צריך להוסיף:** שדה `isCancelled` או `status = 'cancelled'`

## 2. פורטל הספק

### מצב נוכחי:
- הספק רואה עבודות דרך `getSupplierJobsHistory` ב-db.ts
- **אין גישה ישירה לקבצים** - הקבצים (quoteAttachments) נמצאים בפורטל הלקוח בלבד
- סטטוסים של עבודות: pending, in_progress

### יצירת עבודה לספק:
- `createSupplierJobsForCategory` - יוצר עבודה עם סטטוס 'in_progress'
- `assignSupplier` - משייך ספק ומעדכן סטטוס הצעה ל-'in_production'

### מה חסר:
- שדה `isCancelled` לסימון עבודה מבוטלת
- לוגיקה להסתרת קבצים מספק מבוטל
- API לביטול ספק

## 3. תהליך נוכחי

1. הצעה נוצרת בסטטוס `draft`
2. עובד בוחר ספק → נוצרת עבודה ב-supplierJobs
3. הצעה עוברת לסטטוס `in_production`
4. ספק מסמן כמוכן → `supplierMarkedReady = true`

### בעיות בתהליך:
- אין הפרדה בין "נשלח לספק" ל"ספק אישר"
- אין אפשרות לבטל ספק אחרי שליחה

