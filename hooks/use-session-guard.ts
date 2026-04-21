"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getSession, type SessionData } from "@/lib/session";

export function useSessionGuard() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const currentSession = getSession();

    if (!currentSession) {
      router.replace("/");
      return;
    }

    setSession(currentSession);
    setIsReady(true);
  }, [router]);

  return { session, isReady };
}
