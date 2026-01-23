# מיפוי טבלאות וקשרים

## טבלאות ראשיות

### 1. users (משתמשים וגם לקוחות ישנים)
- **תפקידים:** admin, employee, customer, supplier, courier
- **סטטוסים:** pending_approval, active, rejected, deactivated
- **שדות חשובים:** openId, name, email, phone, companyName, role, status, permissions
- **שימוש:** משתמשים של המערכת + לקוחות שאושרו

### 2. customerSignupRequests (לקוחות חדשים ממתינים)
- **סטטוסים:** pending, approved, rejected
- **שדות חשובים:** name, email, phone, companyName, description, queueNumber, status, files
- **שימוש:** לקוחות שנרשמו דרך העמוד הראשון ועדיין לא אושרו
- **זרימה:** pending → approved → מעבר ל-users כ-customer

### 3. quotes (הצעות מחיר)
- **סטטוסים:** draft, sent, approved, rejected, in_production, ready
- **קשרים:** customerId → users, employeeId → users, parentQuoteId → quotes
- **שדות חשובים:** status, finalValue, version, dealRating
- **שימוש:** כל הצעה מחיר בעבור לקוח

### 4. quoteItems (פריטים בהצעה)
- **קשרים:** quoteId → quotes, productVariantId → productVariants, supplierId → users
- **שדות חשובים:** quantity, priceAtTimeOfQuote, supplierCost, deliveryDays
- **שימוש:** כל פריט בהצעה

### 5. baseProducts (מוצרים בסיסיים)
- **שדות חשובים:** name, description, category, isActive
- **שימוש:** מוצרים שמוצעים ללקוחות

### 6. productVariants (וריאנטים של מוצרים)
- **קשרים:** baseProductId → baseProducts
- **שדות חשובים:** name, specifications, isActive
- **שימוש:** וריאנטים שונים של מוצר (צבע, גודל וכו')

### 7. pricelists (מחירונים)
- **שדות חשובים:** name, description, isActive
- **שימוש:** מחירונים שונים לספקים שונים

### 8. pricelistItems (פריטים במחירון)
- **קשרים:** pricelistId → pricelists, productVariantId → productVariants, supplierId → users
- **שדות חשובים:** price, leadTime
- **שימוש:** מחיר של וריאנט בספק מסוים

### 9. customerPricelists (מחירונים שהוקצו ללקוחות)
- **קשרים:** customerId → users, pricelistId → pricelists
- **שימוש:** קשר בין לקוח למחירון

### 10. activityLog (יומן פעילות)
- **שדות חשובים:** userId, actionType, details, createdAt
- **שימוש:** רישום כל פעולה במערכת

### 11. developerLogs (לוגים לדיבאגינג)
- **שדות חשובים:** userId, level, category, action, message, stackTrace
- **שימוש:** דיבאגינג ומעקב אחרי בעיות

## זרימות נתונים חשובות

### זרימת לקוח חדש:
1. לקוח ממלא טופס בעמוד הראשון
2. נשמר ב-`customerSignupRequests` עם סטטוס `pending` + queueNumber
3. מנהל מערכת רואה אותו בדשבורד
4. מנהל אישור/דחיה
5. אם אישור → יוצר משתמש חדש בטבלת `users` עם role `customer` וסטטוס `active`

### זרימת הצעה:
1. עובד יוצר הצעה חדשה → `quotes` עם סטטוס `draft`
2. עובד מוסיף פריטים → `quoteItems`
3. עובד שולח הצעה → `quotes.status = "sent"`
4. לקוח מאשר/דוחה → `quotes.status = "approved"` או `"rejected"`
5. אם אישור → `quotes.status = "in_production"` → `"ready"`

## בעיות שצריך להימנע מהן

❌ **לא לשנות** את הקשרים בין הטבלאות
❌ **לא להוסיף** סטטוסים חדשים בלי לעדכן את כל המקומות שמשתמשים בהם
❌ **לא לשנות** שדות שמשמשים כ-foreign keys
❌ **לא להסיר** טבלאות או שדות ישנים - רק להוסיף חדשים

## כללים לשינויים בטבלאות

1. **כשמוסיפים שדה חדש:** וודא שהוא לא משפיע על queries קיימות
2. **כשמוסיפים סטטוס חדש:** עדכן את כל המקומות שמשתמשים בסטטוסים
3. **כשמוסיפים טבלה חדשה:** וודא שהקשרים לטבלאות אחרות ברורים
4. **כשמשנים פונקציית db:** בדוק את כל המקומות שקוראים לה
