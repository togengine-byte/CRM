# תיקון באג: עדכון מחיר ספק בבחירת ספק בהצעות מחיר

## תיאור הבעיה
כשבוחרים ספק מהמלצות הספקים בדף הצעות מחיר, המחיר לא מתעדכן בשדות שמתחת לבחירת המערכת ובשדה שליד המחירון.

## גורמי הבעיה שזוהו

### 1. חוסר השדה `isManualPrice` ב-API Response
**קובץ:** `server/db/quotes.ts`

**בעיה:** הפונקציה `getQuoteById` לא כללה את השדה `isManualPrice` ב-select של ה-items.

**תיקון:** הוספת השדה `isManualPrice` ל-select:
```typescript
const items = await db.select({
  id: quoteItems.id,
  sizeQuantityId: quoteItems.sizeQuantityId,
  quantity: quoteItems.quantity,
  priceAtTimeOfQuote: quoteItems.priceAtTimeOfQuote,
  isManualPrice: quoteItems.isManualPrice,  // <-- נוסף
  isUpsell: quoteItems.isUpsell,
  supplierId: quoteItems.supplierId,
  supplierCost: quoteItems.supplierCost,
  deliveryDays: quoteItems.deliveryDays,
  supplierName: users.name,
  supplierCompany: users.companyName,
})
```

### 2. שגיאת SQL בעדכון פריט
**קובץ:** `server/supplierRecommendationsByItem.ts`

**בעיה:** הפונקציה `selectSupplierForItem` ניסתה לעדכן עמודה `supplierName` שלא קיימת בטבלת `quote_items`, מה שגרם לשגיאת SQL שמנעה את העדכון.

**תיקון:** הסרת השדה `supplierName` מה-UPDATE:
```typescript
// לפני
await db.execute(sql`
  UPDATE quote_items
  SET "supplierId" = ${supplierId},
      "supplierCost" = ${supplierCost.toString()},
      "priceAtTimeOfQuote" = ${customerPrice.toString()},
      "deliveryDays" = ${deliveryDays},
      "supplierName" = ${supplierName},  // <-- גרם לשגיאה
      "isManualPrice" = false
  WHERE id = ${quoteItemId}
`);

// אחרי
await db.execute(sql`
  UPDATE quote_items
  SET "supplierId" = ${supplierId},
      "supplierCost" = ${supplierCost.toString()},
      "priceAtTimeOfQuote" = ${customerPrice.toString()},
      "deliveryDays" = ${deliveryDays},
      "isManualPrice" = false
  WHERE id = ${quoteItemId}
`);
```

### 3. Cache Invalidation לא מספק
**קובץ:** `client/src/pages/Quotes.tsx`

**בעיה:** ה-callback `onSupplierSelected` לא ביצע invalidation נכון של ה-cache, מה שגרם לכך שהנתונים הישנים נשארו מוצגים.

**תיקון:** שיפור ה-invalidation:
```typescript
// לפני
onSupplierSelected={() => {
  refetch();
  refetchQuoteDetails();
  utils.quotes.list.refetch();
  utils.quotes.getById.refetch();
  setEditedPrices({});
}}

// אחרי
onSupplierSelected={async () => {
  setEditedPrices({});
  await utils.quotes.getById.invalidate({ id: quote.id });
  await utils.quotes.list.invalidate();
  await refetch();
  await refetchQuoteDetails();
}}
```

## קבצים שתוקנו
1. `server/db/quotes.ts` - הוספת `isManualPrice` ל-select
2. `server/supplierRecommendationsByItem.ts` - הסרת `supplierName` מה-UPDATE
3. `client/src/pages/Quotes.tsx` - שיפור cache invalidation (3 מקומות)

## תאריך התיקון
27/01/2026
