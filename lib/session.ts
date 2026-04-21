import type { PaymentType } from "@/lib/monday/types";

const SESSION_KEY = "madrasa-payment-request-session";

export interface SessionData {
  teacherId: number;
  teacherName: string;
  supplierId: number;
  supplierFileStatus: string;
  paymentType: PaymentType;
}

export function saveSession(data: SessionData): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function getSession(): SessionData | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(SESSION_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as SessionData;
  } catch {
    window.sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(SESSION_KEY);
}
