import type { PaymentType } from "@/lib/monday/types";

const SESSION_KEY = "madrasa-payment-request-session";
const SUBMISSION_SUMMARY_KEY = "madrasa-payment-request-submission-summary";

export interface SessionData {
  teacherId: number;
  teacherName: string;
  supplierId: number;
  supplierFileStatus: string;
  paymentType: PaymentType;
}

export interface SubmissionSummary {
  paymentTypeLabel: string;
  subject: string;
  unitLabel?: "מפגשים" | "שיעורים" | "יחידות";
  requestedUnits?: number;
  requiresManualReview: boolean;
  reviewReason?: string | null;
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
  window.sessionStorage.removeItem(SUBMISSION_SUMMARY_KEY);
}

export function saveSubmissionSummary(data: SubmissionSummary): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(SUBMISSION_SUMMARY_KEY, JSON.stringify(data));
}

export function getSubmissionSummary(): SubmissionSummary | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(SUBMISSION_SUMMARY_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as SubmissionSummary;
  } catch {
    window.sessionStorage.removeItem(SUBMISSION_SUMMARY_KEY);
    return null;
  }
}
