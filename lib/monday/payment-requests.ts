// Read-only payment-request list service for the Teacher Portal.
// Server-side only.
//
// PRIVACY: this service intentionally queries ONLY status / submit date /
// payment type. It must never request amount or rate columns
// (TEACHING_AMOUNT, TRAVEL_AMOUNT, TOTAL_TRANSFER or any of the
// PAYMENT_REQUEST_COLUMNS_V2 formula/mirror columns) — the portal never
// shows amounts, rates or balances to teachers.

import { unstable_cache } from "next/cache";

import { fetchQuery } from "@/lib/monday/client";
import {
  BOARD_IDS,
  PAYMENT_REQUEST_COLUMNS,
  PAYMENT_REQUEST_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
} from "@/lib/monday/constants";
import { isMondayPreviewMode } from "@/lib/monday/mock";

export interface PaymentRequestListEntry {
  itemId: number;
  name: string;
  statusLabel: string;
  submitDate: string | null;
  paymentTypeLabel: string;
}

type PaymentRequestColumnValue = {
  id: string;
  text: string | null;
  label?: string | null;
  date?: string | null;
};

type PaymentRequestItemResponse = {
  id: string;
  name: string;
  column_values: PaymentRequestColumnValue[];
};

type PaymentRequestsBoardResponse = {
  boards: Array<{
    items_page: {
      items: PaymentRequestItemResponse[];
    };
  }>;
};

// Only the safe, non-financial columns. Never add amount columns here.
const LIST_COLUMN_IDS = [
  PAYMENT_REQUEST_COLUMNS.STATUS,
  PAYMENT_REQUEST_COLUMNS.SUBMIT_DATE,
  PAYMENT_REQUEST_COLUMNS.PAYMENT_TYPE,
];

const COLUMN_FIELDS = `
  id
  text
  ... on StatusValue {
    label
  }
  ... on DateValue {
    date
  }
`;

const MOCK_PAYMENT_REQUESTS_BY_TEACHER: Record<number, PaymentRequestListEntry[]> = {
  101: [
    {
      itemId: 555004,
      name: "שיעורים פרטיים - יעל כהן - נועם ישראלי",
      statusLabel: PAYMENT_REQUEST_STATUS_LABELS.NEW,
      submitDate: "2026-06-01",
      paymentTypeLabel: PAYMENT_TYPE_LABELS.PRIVATE_LESSONS,
    },
    {
      itemId: 555001,
      name: "קורס - יעל כהן - ערבית מדוברת רמה 2",
      statusLabel: PAYMENT_REQUEST_STATUS_LABELS.WAITING_MANAGER,
      submitDate: "2026-05-02",
      paymentTypeLabel: PAYMENT_TYPE_LABELS.COURSE,
    },
    {
      itemId: 555002,
      name: "קורס - יעל כהן - ערבית למתקדמים",
      statusLabel: PAYMENT_REQUEST_STATUS_LABELS.PAID,
      submitDate: "2026-02-08",
      paymentTypeLabel: PAYMENT_TYPE_LABELS.COURSE,
    },
  ],
};

function getColumn(item: PaymentRequestItemResponse, columnId: string) {
  return item.column_values.find((column) => column.id === columnId);
}

function parsePaymentRequest(item: PaymentRequestItemResponse): PaymentRequestListEntry {
  const status = getColumn(item, PAYMENT_REQUEST_COLUMNS.STATUS);
  const paymentType = getColumn(item, PAYMENT_REQUEST_COLUMNS.PAYMENT_TYPE);

  return {
    itemId: Number(item.id),
    name: item.name,
    statusLabel: status?.label || status?.text || PAYMENT_REQUEST_STATUS_LABELS.NEW,
    submitDate: getColumn(item, PAYMENT_REQUEST_COLUMNS.SUBMIT_DATE)?.date || null,
    paymentTypeLabel: paymentType?.label || paymentType?.text || "",
  };
}

function compareBySubmitDateDesc(left: PaymentRequestListEntry, right: PaymentRequestListEntry) {
  if (!left.submitDate && !right.submitDate) {
    return 0;
  }

  if (!left.submitDate) {
    return 1;
  }

  if (!right.submitDate) {
    return -1;
  }

  return right.submitDate.localeCompare(left.submitDate);
}

const getMyPaymentRequestsCached = unstable_cache(
  async (teacherItemId: number): Promise<PaymentRequestListEntry[]> => {
    const query = `
      query GetMyPaymentRequests($columnIds: [String!]) {
        boards(ids: [${BOARD_IDS.PAYMENT_REQUESTS}]) {
          items_page(
            limit: 100
            query_params: {
              rules: [
                {
                  column_id: "${PAYMENT_REQUEST_COLUMNS.SUBMITTER}"
                  compare_value: [${teacherItemId}]
                  operator: any_of
                }
              ]
            }
          ) {
            items {
              id
              name
              column_values(ids: $columnIds) {
                ${COLUMN_FIELDS}
              }
            }
          }
        }
      }
    `;

    const response = await fetchQuery<PaymentRequestsBoardResponse>(query, {
      columnIds: LIST_COLUMN_IDS,
    });

    return (response.boards[0]?.items_page.items || [])
      .map(parsePaymentRequest)
      .sort(compareBySubmitDateDesc);
  },
  ["portal-my-payment-requests"],
  { revalidate: 30 },
);

/**
 * Payment requests submitted by the given teacher, without any financial
 * data. The teacherItemId must come from the authenticated portal user.
 */
export async function getMyPaymentRequests(
  teacherItemId: number,
): Promise<PaymentRequestListEntry[]> {
  if (isMondayPreviewMode()) {
    return MOCK_PAYMENT_REQUESTS_BY_TEACHER[teacherItemId] ?? [];
  }

  return getMyPaymentRequestsCached(teacherItemId);
}
