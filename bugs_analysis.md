# דוח ניתוח באגים ובעיות בקוד - מערכת CRM

## סיכום מנהלים

לאחר ניתוח מעמיק של קוד המערכת, זיהיתי מספר באגים ובעיות פוטנציאליות. חלקם קריטיים וחלקם בעיות ברמה נמוכה יותר. להלן הממצאים המפורטים.

---

## באגים קריטיים (Critical)

### 1. חוסר בדיקת הרשאות ב-`quotes.request`

**קובץ:** `server/routers.ts` (שורות 754-760)

**הבעיה:** הפונקציה `quotes.request` משתמשת ב-`protectedProcedure` אבל לא בודקת את התפקיד של המשתמש. כל משתמש מאומת (כולל ספקים ושליחים) יכול ליצור הצעות מחיר בשם עצמו.

```typescript
request: protectedProcedure
  .input(z.object({
    items: z.array(z.object({
      sizeQuantityId: z.number(),
      quantity: z.number(),
    })).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user) throw new Error("Not authenticated");
    return await createQuoteRequest({
      customerId: ctx.user.id,  // כל משתמש יכול ליצור quote
      items: input.items || [],
    });
  }),
```

**תיקון מומלץ:**
```typescript
.mutation(async ({ ctx, input }) => {
  if (!ctx.user) throw new Error("Not authenticated");
  if (ctx.user.role !== 'customer' && ctx.user.role !== 'admin' && ctx.user.role !== 'employee') {
    throw new Error("Only customers can request quotes");
  }
  // ...
});
```

---

### 2. Race Condition ב-`createQuoteRequest`

**קובץ:** `server/db.ts` (שורות 553-588)

**הבעיה:** הפונקציה מבצעת `SELECT nextval` ואז `INSERT` בנפרד, ללא transaction. במקרה של בקשות מקבילות, ייתכנו מספרי הצעות כפולים או דילוגים.

```typescript
const seqResult = await db.execute(sql`SELECT nextval('quote_number_seq') as next_num`) as any;
const quoteNumber = Number(seqResult.rows?.[0]?.next_num || seqResult[0]?.next_num || 1);

const result = await db.insert(quotes).values({
  // ...
  quoteNumber: quoteNumber,
});
```

**תיקון מומלץ:** לעטוף את כל הפעולה ב-transaction:
```typescript
await db.transaction(async (tx) => {
  const seqResult = await tx.execute(sql`SELECT nextval('quote_number_seq') as next_num`);
  // ... המשך הפעולות
});
```

---

### 3. SQL Injection פוטנציאלי ב-`updateSupplierJobData`

**קובץ:** `server/db.ts` (שורות 3777-3823)

**הבעיה:** הפונקציה בונה שאילתת SQL באופן ידני עם `sql.raw()` ומשרשרת ערכים ישירות לתוך המחרוזת:

```typescript
if (data.supplierReadyAt !== undefined) {
  if (data.supplierReadyAt === null) {
    updateFields.push(`"supplierReadyAt" = NULL`);
  } else {
    updateFields.push(`"supplierReadyAt" = '${data.supplierReadyAt.toISOString()}'`);  // סכנה!
  }
}

await db.execute(sql.raw(`
  UPDATE supplier_jobs 
  SET ${updateFields.join(', ')}, "updatedAt" = NOW()
  WHERE id = ${jobId}
`));
```

**תיקון מומלץ:** להשתמש ב-Drizzle ORM במקום SQL גולמי:
```typescript
await db.update(supplierJobs)
  .set({
    supplierRating: data.supplierRating,
    courierConfirmedReady: data.courierConfirmedReady,
    // ...
  })
  .where(eq(supplierJobs.id, jobId));
```

---

### 4. חוסר בדיקת בעלות ב-`deleteNote`

**קובץ:** `server/db.ts` (שורות 2033-2043)

**הבעיה:** הפונקציה מאפשרת למחוק הערה לפי ID ללא בדיקה שהמשתמש הוא הכותב או שיש לו הרשאה:

```typescript
export async function deleteNote(noteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(internalNotes)
    .where(eq(internalNotes.id, noteId));  // אין בדיקת בעלות!

  await logActivity(userId, "note_deleted", { noteId });

  return { success: true };
}
```

**תיקון מומלץ:**
```typescript
// בדוק שההערה שייכת למשתמש או שהמשתמש הוא admin
const note = await db.select().from(internalNotes).where(eq(internalNotes.id, noteId)).limit(1);
if (!note[0]) throw new Error("Note not found");
if (note[0].authorId !== userId && userRole !== 'admin') {
  throw new Error("Not authorized to delete this note");
}
```

---

## באגים בינוניים (Medium)

### 5. חוסר ולידציה של מייל ייחודי ב-`createCustomerWithQuote`

**קובץ:** `server/createCustomerWithQuote.ts` (שורות 20-96)

**הבעיה:** הפונקציה יוצרת לקוח חדש ללא בדיקה אם המייל כבר קיים במערכת, מה שיכול לגרום לכפילויות.

**תיקון מומלץ:**
```typescript
const existingUser = await db.select().from(users).where(eq(users.email, input.customerInfo.email)).limit(1);
if (existingUser.length > 0) {
  throw new Error("Email already exists in the system");
}
```

---

### 6. חוסר טיפול ב-Edge Case ב-`getQuoteHistory`

**קובץ:** `server/db.ts` (שורות 484-528)

**הבעיה:** הפונקציה מבצעת לולאה אינסופית פוטנציאלית אם יש מעגליות בנתונים (parentQuoteId מצביע על עצמו או על צאצא):

```typescript
while (parentId) {
  const [parent] = await db.select()
    .from(quotes)
    .where(eq(quotes.id, parentId))
    .limit(1);
  if (parent.length === 0) break;
  currentQuote = parent[0];
  rootId = currentQuote.id;
  parentId = currentQuote.parentQuoteId;  // אם יש מעגליות - לולאה אינסופית
}
```

**תיקון מומלץ:**
```typescript
const visited = new Set<number>();
while (parentId && !visited.has(parentId)) {
  visited.add(parentId);
  // ...
}
```

---

### 7. חוסר עקביות בטיפול בשגיאות מסד נתונים

**קובץ:** `server/db.ts` (מספר מקומות)

**הבעיה:** חלק מהפונקציות מחזירות `null` או מערך ריק כשמסד הנתונים לא זמין, וחלק זורקות שגיאה. זה יוצר חוסר עקביות:

```typescript
// מחזיר null
export async function getCustomerById(customerId: number) {
  const db = await getDb();
  if (!db) return null;  // שקט
  // ...
}

// זורק שגיאה
export async function createProduct(input: CreateProductInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");  // רועש
  // ...
}
```

**תיקון מומלץ:** להגדיר מדיניות אחידה - או תמיד לזרוק שגיאה או תמיד להחזיר ערך ברירת מחדל.

---

### 8. חוסר ולידציה של קלט ב-`calculateProductPrice`

**קובץ:** `server/db.ts` (שורות 3586-3657)

**הבעיה:** הפונקציה לא מוודאת שה-`sizeId` שייך ל-`productId` שנשלח:

```typescript
export async function calculateProductPrice(input: {
  productId: number;
  sizeId: number;
  // ...
}) {
  // אין בדיקה שה-sizeId שייך ל-productId!
  const [size] = await db.select()
    .from(productSizes)
    .where(eq(productSizes.id, input.sizeId))
    .limit(1);
  // ...
}
```

**תיקון מומלץ:**
```typescript
const [size] = await db.select()
  .from(productSizes)
  .where(and(
    eq(productSizes.id, input.sizeId),
    eq(productSizes.productId, input.productId)
  ))
  .limit(1);
```

---

## באגים קלים (Low)

### 9. קובץ `relations.ts` ריק

**קובץ:** `drizzle/relations.ts`

**הבעיה:** הקובץ מכיל רק `import {} from "./schema";` ללא הגדרות relations. זה עלול לגרום לבעיות ב-queries מורכבים עם Drizzle.

---

### 10. שימוש ב-`any` type

**קבצים:** מספר קבצים

**הבעיה:** שימוש נרחב ב-`any` במקום טיפוסים מדויקים, מה שמפחית את בטיחות הטיפוסים:

```typescript
// דוגמה מ-supplierPortal.ts
const updateData: any = { updatedAt: new Date() };

// דוגמה מ-routers.ts
const typedItem = item as { id: number; sizeQuantityId: number; quantity: number };
```

---

### 11. חוסר ניקוי קבצים זמניים

**קובץ:** `server/_core/oauth.ts` (שורות 33-58)

**הבעיה:** קבצים שמועלים נשמרים ב-`uploads/customer-requests/` אבל אין מנגנון לניקוי קבצים ישנים או קבצים של בקשות שנדחו.

---

### 12. Hardcoded Values

**קובץ:** `server/supplierRecommendations.ts` (שורות 27-48)

**הבעיה:** ערכי ציון קבועים בקוד במקום בהגדרות מערכת:

```typescript
const SCORING_CONFIG = {
  baseScore: {
    noJobs: 70,
    fewJobs: 80,
    // ...
  },
  // ...
};
```

---

## המלצות כלליות

1. **הוספת Transactions:** לעטוף פעולות מרובות ב-transactions כדי להבטיח עקביות נתונים.

2. **ולידציה מרכזית:** ליצור middleware או פונקציות עזר לבדיקות הרשאות נפוצות.

3. **Logging משופר:** להוסיף logging מפורט יותר לפעולות קריטיות.

4. **בדיקות יחידה:** להוסיף בדיקות יחידה לפונקציות הקריטיות.

5. **Rate Limiting:** להוסיף הגבלת קצב לנקודות קצה ציבוריות.

---

## סיכום

| רמת חומרה | מספר באגים |
|-----------|------------|
| קריטי | 4 |
| בינוני | 4 |
| קל | 4 |
| **סה"כ** | **12** |

הבאגים הקריטיים ביותר הם בעיות אבטחה (SQL Injection, חוסר בדיקת הרשאות) ובעיות עקביות נתונים (Race Conditions). מומלץ לטפל בהם בעדיפות גבוהה.
