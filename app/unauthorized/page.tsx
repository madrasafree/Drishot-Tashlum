import { StatePageCard } from "@/components/portal/state-page";

export const dynamic = "force-dynamic";

const REASON_CONTENT: Record<string, { title: string; description: string }> = {
  unauthenticated: {
    title: "נדרשת התחברות",
    description:
      "כדי להיכנס לפורטל המורים יש להתחבר דרך Cloudflare Access. אם הגעת לכאן אחרי התחברות, ייתכן שהגדרת ה-Access חסרה בסביבה זו.",
  },
  not_found: {
    title: "המייל לא נמצא",
    description:
      "כתובת המייל שאיתה התחברת לא נמצאה ברשימת המורים הפעילים של מדרסה. ודאו שהמייל בכרטיס המורה במאנדיי זהה למייל ההתחברות.",
  },
  duplicate_email: {
    title: "כתובת מייל כפולה",
    description:
      "כתובת המייל שלך מופיעה ביותר מכרטיס מורה אחד במאנדיי, ולכן הכניסה נחסמה ליתר ביטחון. פנו למשרד כדי לאחד את הכרטיסים.",
  },
  config_error: {
    title: "חסרה הגדרת מערכת",
    description:
      "הפורטל זיהה הגדרה חסרה (מיפוי לוח או עמודה במאנדיי). מנהל המערכת יכול לראות את הפירוט בעמוד האבחון.",
  },
  monday_error: {
    title: "שגיאה בחיבור למאנדיי",
    description: "לא הצלחנו לטעון את הנתונים ממאנדיי. נסו שוב בעוד כמה דקות.",
  },
  forbidden: {
    title: "אין הרשאה",
    description: "אין לחשבון שלך הרשאה לעמוד שביקשת.",
  },
};

const DEFAULT_CONTENT = {
  title: "אין גישה לפורטל",
  description: "לא הצלחנו לאמת את הגישה שלך לפורטל המורים.",
};

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const content = (reason && REASON_CONTENT[reason]) || DEFAULT_CONTENT;

  return <StatePageCard title={content.title} description={content.description} />;
}
