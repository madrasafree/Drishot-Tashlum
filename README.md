# Drishot-Tashlum

## Madrasa Payment Requests

אפליקציית Next.js להגשת דרישות תשלום למורים בעמותת מדרסה. האפליקציה מחליפה טופס Fillout קיים, שומרת state זמני ב-`sessionStorage`, וקוראת/כותבת ישירות ל-`Monday.com` דרך GraphQL API בלי מסד נתונים.

## מודל המוצר הנוכחי

- המורה לא רואה סכומים, תעריפים, צפי תשלום או יתרת כסף.
- מסלולי `קורס` ו-`החלפה` מבוססים על מספר מפגשים בלבד.
- מסלול `שיעורים פרטיים` מבוסס על מספר שיעורים בלבד.
- סכומים שנדרשים למאנדיי מחושבים פנימית בצד השרת או מסומנים לבדיקה ידנית אם חסר מידע אמין.
- האפיון המפורט נמצא ב-`docs/system-spec.md`.

## Stack

- Next.js 15 עם App Router ו-TypeScript
- Tailwind CSS וקומפוננטות בסגנון shadcn/ui
- RTL מלא בעברית
- Monday GraphQL API בלבד, ללא DB
- פריסה מיועדת ל-Vercel

## הרצה מקומית

1. התקן תלויות:

```bash
npm install
```

2. צור קובץ `.env.local` כשרוצים להתחבר ל-Monday. בלי הקובץ הזה האפליקציה תעלה במצב preview עם נתוני דמה:

```env
MONDAY_API_TOKEN=your_token_here
MONDAY_API_URL=https://api.monday.com/v2
MONDAY_PREVIEW_MODE=false
```

3. הרץ סביבת פיתוח:

```bash
npm run dev
```

4. פתח את [http://localhost:3000](http://localhost:3000)

## Environment Variables

- `MONDAY_API_TOKEN` נדרש רק לחיבור אמיתי ל-Monday. אם הוא חסר, האפליקציה עוברת אוטומטית ל-preview.
- `MONDAY_API_URL` אופציונלי. ברירת מחדל: `https://api.monday.com/v2`
- `MONDAY_PREVIEW_MODE` אופציונלי. `true` מכריח preview, `false` מכריח חיבור אמיתי ודורש `MONDAY_API_TOKEN`.

## פריסה ב-Cloudflare

1. העלה את הריפו ל-GitHub.
2. חבר את הריפו לפרויקט Cloudflare Workers / Pages שמריץ את פקודות הבילד מהריפו.
3. הוסף ב-Cloudflare את משתני הסביבה לחיבור אמיתי:
   `MONDAY_API_TOKEN`
   `MONDAY_API_URL=https://api.monday.com/v2`
4. לפני הוספת הטוקן אפשר לפרוס ולסייר באפליקציה במצב preview אוטומטי.

## מבנה עיקרי

- `app/` מכיל את דפי ה-UI, דפי ההגשה, דף ההצלחה ו-API routes
- `lib/monday/` מכיל constants, טיפוסים, client ו-query helpers ל-Monday
- `lib/payment/` מכיל קונפיגורציית מסלולים, ולידציית מפגשים וחישוב פנימי
- `lib/session.ts` מנהל את `sessionStorage` בין שלבי הטופס
- `components/` מכיל קומפוננטות UI וקומפוננטות shared

## Verification Notes

- ההטמעה נבנתה כך שכאשר חסרים נתוני מפגשים או שדות חדשים במאנדיי, המערכת לא מנחשת ומחזירה configuration error או מסמנת בדיקה ידנית לפי ההקשר.
- הקריאות ל-Monday מתועדות ב-`console.log`/`console.warn` ומוגבלות ל-timeout של 10 שניות.
- `getCoursesForTeacher` נשמר עם cache של 30 שניות כדי להפחית שימוש מיותר ב-quota של Monday.

## Monday Boards

- דרישות תשלום: [Board 8396771037](https://monday.com/boards/8396771037)
- ספקים מדרסה: [Board 9101632052](https://monday.com/boards/9101632052)
- מורים לקורסים: [Board 1179972988](https://monday.com/boards/1179972988)
- קורסים משולבים: [Board 914870132](https://monday.com/boards/914870132)
- הרשמות לשיעורים פרטיים: [Board 18082848395](https://monday.com/boards/18082848395)

## הערות

- אין באפליקציה אימות משתמשים. המורה נבחר מתוך רשימה פעילה.
- חסימת תיק ספק מתבצעת לפני המעבר למסלול ההגשה.
- אם Monday API נכשל, ה-session נשמר כדי לאלץ פחות מילוי מחדש.
