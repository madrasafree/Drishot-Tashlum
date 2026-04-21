# Drishot-Tashlum

## Madrasa Payment Requests

אפליקציית Next.js להגשת דרישות תשלום למורים בעמותת מדרסה. האפליקציה מחליפה טופס Fillout קיים, שומרת state זמני ב-`sessionStorage`, וקוראת/כותבת ישירות ל-`Monday.com` דרך GraphQL API בלי מסד נתונים.

## What V2 Adds

- הצגת תעריפי קורס מוסכמים במסלולי `קורס` ו-`החלפה`, כולל אזהרת חריגה של ±10%.
- בדיקת כפילות חכמה שמונעת הגשת דרישת `קורס` פעילה כפולה על אותו קורס ואותו מורה.
- זיהוי דרישות `החלפה` קיימות עבור הקורס והצעת קיזוז אוטומטי, כולל יצירת update ב-Monday אחרי ההגשה.

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

2. צור קובץ `.env.local` עם:

```env
MONDAY_API_TOKEN=your_token_here
MONDAY_API_URL=https://api.monday.com/v2
```

3. הרץ סביבת פיתוח:

```bash
npm run dev
```

4. פתח את [http://localhost:3000](http://localhost:3000)

## Environment Variables

- `MONDAY_API_TOKEN` חובה
- `MONDAY_API_URL` אופציונלי. ברירת מחדל: `https://api.monday.com/v2`

## פריסה ב-Vercel

1. העלה את הריפו ל-GitHub.
2. צור פרויקט חדש ב-Vercel וחבר את הריפו.
3. הוסף ב-Vercel את משתני הסביבה:
   `MONDAY_API_TOKEN`
   `MONDAY_API_URL=https://api.monday.com/v2`
4. בצע Deploy.

## מבנה עיקרי

- `app/` מכיל את דפי ה-UI, דפי ההגשה, דף ההצלחה ו-API routes
- `lib/monday/` מכיל constants, טיפוסים, client ו-query helpers ל-Monday
- `lib/session.ts` מנהל את `sessionStorage` בין שלבי הטופס
- `components/` מכיל קומפוננטות UI וקומפוננטות shared

## Verification Notes

- ההטמעה נבנתה כך שכל כשל בפיצ'רי V2 הלא-קריטיים, כמו בדיקת כפילות או זיהוי החלפות, לא יחסום הגשה אם קריאת Monday עצמה נכשלה.
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
