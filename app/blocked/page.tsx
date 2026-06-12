import { StatePageCard } from "@/components/portal/state-page";

export const dynamic = "force-dynamic";

export default function BlockedPage() {
  return (
    <StatePageCard
      title="הגישה לפורטל חסומה"
      description="הגישה שלך לפורטל המורים חסומה או שהחשבון אינו פעיל. אם לדעתך מדובר בטעות, פנו למשרד מדרסה."
    />
  );
}
