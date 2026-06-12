// Protected portal shell. requirePortalUser() redirects pending/blocked/
// unauthorized users before any portal page renders. The root layout already
// wraps everything in AppShell, so this layout only adds the portal chrome.

import type { ReactNode } from "react";

import { PortalNav } from "@/components/portal/portal-nav";
import { isPortalPreviewAuth } from "@/lib/auth/current-user";
import { requirePortalUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await requirePortalUser();

  return (
    <div className="space-y-6">
      <PortalNav name={user.name} role={user.role} isPreview={isPortalPreviewAuth()} />
      {children}
    </div>
  );
}
