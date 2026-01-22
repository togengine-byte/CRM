# ניתוח באגים ובעיות בקוד CRM

## סיכום מבנה הפרויקט

הפרויקט הוא מערכת CRM מבוססת:
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Express + tRPC + Drizzle ORM
- **Database**: PostgreSQL
- **Auth**: מנגנון התחברות עם email/password + JWT sessions

---

## באגים שנמצאו

### 1. **באג קריטי: קובץ api/auth/login.ts לא תואם למנגנון ההתחברות**

**קובץ**: `api/auth/login.ts`

**בעיה**: הקובץ מיועד ל-Vercel Serverless אבל משתמש בקוד בדיקה ישן שמחפש `code: '1234'` במקום email/password.

```typescript
// קוד בעייתי (שורות 33-37):
const { code } = req.body || {};
if (!code || code !== '1234') {
  return res.status(401).json({ error: 'Invalid code' });
}
```

**פתרון**: הקובץ צריך להיות מעודכן להשתמש במנגנון email/password כמו ב-`server/_core/oauth.ts`.

---

### 2. **באג: שדה entityType ב-activityLog**

**קובץ**: `server/customerPortal.ts` (שורות 207-214, 266-277)

**בעיה**: מוסיפים שדות `entityType` ו-`entityId` ל-activityLog אבל הסכמה לא כוללת אותם.

```typescript
// קוד בעייתי:
await db.insert(activityLog).values({
  entityType: "quote",  // לא קיים בסכמה!
  entityId: input.quoteId,  // לא קיים בסכמה!
  ...
});
```

**סכמה נוכחית** (`drizzle/schema.ts`):
```typescript
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  actionType: varchar("actionType", { length: 100 }).notNull(),
  details: jsonb("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**פתרון**: להוסיף את השדות לסכמה או להעביר את המידע ל-`details`.

---

### 3. **באג: useState שגוי ב-Settings.tsx**

**קובץ**: `client/src/pages/Settings.tsx` (שורות 85-89)

**בעיה**: שימוש שגוי ב-`useState` במקום `useEffect`:

```typescript
// קוד בעייתי:
useState(() => {
  if (weights) {
    setLocalWeights(weights);
  }
});
```

**פתרון**: להחליף ל-`useEffect`:
```typescript
useEffect(() => {
  if (weights) {
    setLocalWeights(weights);
  }
}, [weights]);
```

---

### 4. **באג פוטנציאלי: חוסר עקביות בין שני מנגנוני Auth**

**בעיה**: קיימים שני מנגנוני Auth שונים:
1. `AuthContext` (client/src/contexts/AuthContext.tsx) - משתמש ב-fetch ישיר
2. `useAuth` (client/src/_core/hooks/useAuth.ts) - משתמש ב-tRPC

**השלכות**: 
- Settings.tsx משתמש ב-`useAuth` מ-_core
- DashboardLayout ו-ProtectedRoute משתמשים ב-`useAuthContext`

**פתרון**: לאחד את מנגנוני ה-Auth או לוודא שהם סינכרוניים.

---

### 5. **באג: קובץ Login.tsx לא בשימוש**

**קובץ**: `client/src/pages/Login.tsx`

**בעיה**: הקובץ קיים אבל לא מנותב ב-App.tsx. יש כפילות עם LandingPage.tsx.

---

### 6. **באג: CORS עם wildcard + credentials**

**קובץ**: `api/trpc/[trpc].ts` (שורות 29-31)

**בעיה**: 
```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Credentials', 'true');
```

**הסבר**: לא ניתן להשתמש ב-`*` עם `credentials: true`. הדפדפנים יחסמו את הבקשה.

**פתרון**: להשתמש ב-origin ספציפי או לקרוא את ה-origin מה-request.

---

### 7. **באג: חוסר בדיקת קובץ uploadedAt**

**קובץ**: `drizzle/schema.ts` (שורה 146)

**בעיה**: השדה נקרא `uploadedAt` אבל בקוד יש שימוש ב-`createdAt`:
```typescript
uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
```

בעוד ש-customerPortal.ts משתמש ב:
```typescript
createdAt: quoteAttachments.createdAt,  // לא קיים!
```

---

## בעיות אבטחה

### 1. **Secret Key קשיח בקוד**

**קובץ**: `server/routers.ts` (שורה 164)

```typescript
if (input.secretKey !== 'SETUP_ADMIN_2024') {
  throw new Error('Invalid secret key');
}
```

**פתרון**: להעביר ל-environment variable.

---

## המלצות לשיפור

1. **לאחד את מנגנוני ה-Auth** - להשתמש רק ב-AuthContext או רק ב-useAuth
2. **להוסיף validation** - לוודא שכל הקלטים מאומתים
3. **לעדכן את api/auth/login.ts** - להתאים למנגנון החדש
4. **להסיר קוד מת** - Login.tsx לא בשימוש
5. **לתקן את CORS** - לא להשתמש ב-wildcard עם credentials
