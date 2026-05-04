import { BOARD_IDS, COURSE_STATE_LABELS } from "@/lib/monday/constants";
import type { PaymentRouteConfig, PaymentRouteKey } from "@/lib/monday/types";

export const PAYMENT_ROUTE_CONFIGS: Record<PaymentRouteKey, PaymentRouteConfig> = {
  course: {
    routeKey: "course",
    label: "קורס",
    sourceBoardId: BOARD_IDS.COURSES,
    allowedCourseStatuses: [COURSE_STATE_LABELS.FINISHED],
    unitLabel: "מפגשים",
    requiresCourse: true,
    calculationMode: "course_meetings",
  },
  replacement: {
    routeKey: "replacement",
    label: "החלפה",
    sourceBoardId: BOARD_IDS.COURSES,
    allowedCourseStatuses: [COURSE_STATE_LABELS.RUNNING, COURSE_STATE_LABELS.FINISHED],
    unitLabel: "מפגשים",
    requiresCourse: true,
    requiresReplacedTeacher: true,
    requiresManualDescription: true,
    calculationMode: "course_meetings",
  },
  private: {
    routeKey: "private",
    label: "שיעורים פרטיים",
    sourceBoardId: BOARD_IDS.PRIVATE_LESSONS,
    unitLabel: "שיעורים",
    requiresCourse: false,
    calculationMode: "private_lessons",
  },
  other: {
    routeKey: "other",
    label: "אחר",
    unitLabel: "יחידות",
    requiresCourse: false,
    requiresManualDescription: true,
    calculationMode: "manual",
  },
};

export function getPaymentRouteConfig(routeKey: PaymentRouteKey) {
  return PAYMENT_ROUTE_CONFIGS[routeKey];
}
