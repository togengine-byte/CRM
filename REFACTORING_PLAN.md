# תכנית ריפקטורינג - Quotes.tsx

**סטטוס: ✅ הושלם**

## סקירת המצב הנוכחי

### סטטיסטיקות
- **שורות קוד:** ~2,250
- **משתני State:** ~20
- **Mutations:** ~12
- **Queries:** ~8
- **קומפוננטות פנימיות:** 3

### בעיות שזוהו

1. **קובץ ארוך מדי** - 2,250 שורות בקובץ אחד
2. **קומפוננטות מוטמעות** - 3 קומפוננטות מוגדרות בתוך הקובץ
3. **State מורכב** - ~20 משתני useState בקומפוננטה הראשית
4. **כפילות קוד** - לוגיקה חוזרת ב-onSupplierSelected
5. **חוסר הפרדה** - לוגיקה, UI ו-data fetching מעורבבים

---

## מבנה חדש מוצע

```
client/src/
├── pages/
│   └── Quotes.tsx                    # קומפוננטה ראשית מצומצמת (~400 שורות)
│
├── components/quotes/
│   ├── index.ts                      # exports
│   ├── QuoteFilters.tsx              # סינון וחיפוש
│   ├── QuoteTable.tsx                # טבלת הצעות
│   ├── QuoteExpandedRow.tsx          # שורה מורחבת עם פרטי הצעה
│   ├── QuoteItemsList.tsx            # רשימת פריטים עם עריכת מחירים
│   ├── QuotePricelistSelector.tsx    # בחירת מחירון
│   ├── QuoteHistory.tsx              # היסטוריית גרסאות
│   ├── QuoteActions.tsx              # כפתורי פעולות
│   ├── CreateQuoteDialog.tsx         # דיאלוג יצירת הצעה
│   ├── StatusUpdateDialog.tsx        # דיאלוג עדכון סטטוס
│   └── PricingEditorDialog.tsx       # דיאלוג עריכת מחירים
│
├── components/suppliers/
│   ├── index.ts
│   ├── SupplierSelectionModal.tsx    # מודאל בחירת ספק
│   ├── SupplierRecommendationsByItem.tsx
│   └── SupplierRecommendationsByCategory.tsx
│
├── hooks/quotes/
│   ├── index.ts
│   ├── useQuoteFilters.ts            # state וlogic של סינון
│   ├── useQuoteExpansion.ts          # state של הרחבת שורה
│   ├── useQuotePricing.ts            # לוגיקת תמחור
│   ├── useQuoteMutations.ts          # כל ה-mutations
│   └── useCreateQuoteForm.ts         # state של טופס יצירה
│
├── types/quotes.ts                   # TypeScript types
│
└── utils/quotes/
    ├── index.ts
    ├── statusHelpers.ts              # getStatusBadge, getActionButtons
    └── priceHelpers.ts               # פונקציות עזר למחירים
```

---

## סדר ביצוע (שלבים)

### שלב 1: חילוץ קומפוננטות עצמאיות
**קבצים:** `SupplierSelectionModal.tsx`, `SupplierRecommendationsByItem.tsx`, `SupplierRecommendationsByCategory.tsx`

אלו קומפוננטות עצמאיות לחלוטין שכבר מוגדרות בתחתית הקובץ.
- העברה לתיקייה `components/suppliers/`
- יצירת קובץ types משותף
- עדכון imports ב-Quotes.tsx

### שלב 2: חילוץ Custom Hooks
**קבצים:** `useQuoteFilters.ts`, `useQuoteExpansion.ts`, `useQuotePricing.ts`, `useQuoteMutations.ts`

- חילוץ כל ה-useState הקשורים לסינון ל-`useQuoteFilters`
- חילוץ לוגיקת הרחבת שורה ל-`useQuoteExpansion`
- חילוץ לוגיקת תמחור ל-`useQuotePricing`
- איחוד כל ה-mutations ל-`useQuoteMutations`

### שלב 3: חילוץ קומפוננטות תצוגה
**קבצים:** `QuoteExpandedRow.tsx`, `QuoteItemsList.tsx`, `CreateQuoteDialog.tsx`

- חילוץ השורה המורחבת (הקוד הכי ארוך)
- חילוץ רשימת הפריטים עם עריכת מחירים
- חילוץ דיאלוג יצירת הצעה

### שלב 4: ניקוי וארגון סופי
- חילוץ פונקציות עזר (getStatusBadge, getActionButtons)
- יצירת קובץ types מרכזי
- ניקוי הקובץ הראשי

---

## עקרונות מנחים

1. **שמירה על פונקציונליות** - כל שלב יסתיים בקוד עובד
2. **בדיקות TypeScript** - אחרי כל שלב
3. **שמירת Props API** - הקומפוננטות החדשות יקבלו props ברורים
4. **הימנעות מ-prop drilling** - שימוש ב-hooks לניהול state משותף
5. **תיעוד** - הערות JSDoc לקומפוננטות ו-hooks חדשים

---

## Types לחילוץ

```typescript
// types/quotes.ts

export type QuoteStatus = "draft" | "sent" | "approved" | "rejected" | "superseded" | "in_production" | "ready";

export interface QuoteItem {
  sizeQuantityId: number;
  quantity: number;
  notes?: string;
  productName?: string;
  sizeName?: string;
}

export interface EditedPrice {
  customerPrice: number;
  isManual: boolean;
}

export interface CreateQuoteForm {
  notes: string;
  items: QuoteItem[];
  customerId: number | null;
  files: File[];
}
```

---

## הערכת זמן

| שלב | משימה | זמן משוער |
|-----|-------|-----------|
| 1 | חילוץ קומפוננטות ספקים | 15 דקות |
| 2 | חילוץ hooks | 20 דקות |
| 3 | חילוץ קומפוננטות תצוגה | 25 דקות |
| 4 | ניקוי וארגון | 10 דקות |
| - | בדיקות | 10 דקות |
| **סה"כ** | | **~80 דקות** |
