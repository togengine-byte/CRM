# ניתוח באגים ובעיות בקוד CRM

## סיכום מבנה הפרויקט

הפרויקט הוא מערכת CRM מבוססת:
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Express + tRPC + Drizzle ORM
- **Database**: PostgreSQL
- **Auth**: מנגנון התחברות עם email/password + JWT sessions

---

## סטטוס באגים (נכון ל-24/01/2026)

| # | קובץ | תיאור הבעיה | סטטוס |
|---|---|---|---|
| 1 | `api/auth/login.ts` | שימוש בקוד בדיקה ישן במקום אימות אימייל וסיסמה. | **תוקן** |
| 2 | `server/customerPortal.ts` | הוספת `entityType` ו-`entityId` ל-`activityLog` למרות שהשדות לא קיימים בסכמה. | **קיים** |
| 3 | `client/src/pages/Settings.tsx` | שימוש שגוי ב-`useState` במקום `useEffect` לעדכון מצב מקומי. | **קיים** |
| 4 | `client/src/contexts/AuthContext.tsx` ו-`client/src/_core/hooks/useAuth.ts` | קיימים שני מנגנוני אימות שונים (AuthContext ו-useAuth) הגורמים לחוסר עקביות. | **קיים** |
| 5 | `client/src/pages/Login.tsx` | קובץ `Login.tsx` קיים אך אינו בשימוש ואינו מנותב ב-`App.tsx`. | **קיים** |
| 6 | `api/trpc/[trpc].ts` | שימוש ב-`Access-Control-Allow-Origin: *` יחד עם `credentials: true` הגורם לשגיאות CORS. | **תוקן** (ראה תזכורת) |
| 7 | `drizzle/schema.ts` | חוסר התאמה בשם השדה `uploadedAt` בטבלת `quoteAttachments` (בשימוש `createdAt`). | **קיים** |

---

## בעיות אבטחה

### 1. **Secret Key קשיח בקוד**

**קובץ**: `server/routers.ts`

**בעיה מקורית**: מפתח סודי (`SETUP_ADMIN_2024`) היה מוטמע בקוד.

**סטטוס**: **תוקן**

**פתרון שיושם**: הקוד עודכן לשימוש במשתנה סביבה `ADMIN_SETUP_KEY`:
```typescript
const adminSetupKey = process.env.ADMIN_SETUP_KEY || 'CHANGE_THIS_DEFAULT_KEY';
if (input.secretKey !== adminSetupKey) {
  throw new Error('Invalid secret key');
}
```

---

## תזכורות למעבר לדומיין אמיתי (Production)

### CORS - הגדרת FRONTEND_URL

כשעוברים לדומיין אמיתי, יש להגדיר משתנה סביבה בשרת:

```
FRONTEND_URL=https://your-domain.com
```

**למה זה חשוב?**
הקובץ `api/trpc/[trpc].ts` משתמש ברשימת כתובות מורשות ל-CORS:
```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,  // <-- זה המשתנה שצריך להגדיר!
];
```

**בלי הגדרה זו**, הדפדפן יחסום בקשות מהדומיין האמיתי לשרת.

---

## המלצות לשיפור

1.  **לאחד את מנגנוני ה-Auth** - להשתמש רק ב-AuthContext או רק ב-useAuth.
2.  **להוסיף validation** - לוודא שכל הקלטים מאומתים.
3.  **להסיר קוד מת** - `Login.tsx` לא בשימוש.
4.  **לתקן את CORS** - לוודא שהגדרות ה-CORS נכונות לסביבת הייצור.
5.  **לתקן את כל הבאגים שנותרו במצב "קיים"**.
