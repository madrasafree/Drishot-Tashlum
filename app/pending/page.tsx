import { StatePageCard } from "@/components/portal/state-page";

export const dynamic = "force-dynamic";

export default function PendingPage() {
  return (
    <StatePageCard
      title="הבקשה ממתינה לאישור"
      description="החשבון שלך זוהה אך הגישה לפורטל המורים עדיין ממתינה לאישור צוות מדרסה. נעדכן אותך במייל ברגע שהגישה תאושר."
    />
  );
}
