export const BOARD_IDS = {
  PAYMENT_REQUESTS: 8396771037,
  SUPPLIERS: 9101632052,
  TEACHERS: 1179972988,
  COURSES: 914870132,
  PRIVATE_LESSONS: 18082848395,
} as const;

export const PAYMENT_REQUEST_COLUMNS = {
  SUBMITTER: "connect_boards_mkmtjb7v",
  SUPPLIER: "board_relation_mkqw15s9",
  SUPPLIER_APPROVAL: "lookup_mkr3nbkn",
  ITEM_NAME: "text_mkrbkwdh",
  DETAILS: "text_mkpvbcde",
  SUBMIT_DATE: "date_mkn83j86",
  TEACHING_AMOUNT: "numbers_mkmv6m0m",
  TRAVEL_AMOUNT: "numeric_mknf5vt3",
  STATUS: "color_mkptpky8",
  COURSE: "connect_boards_mkmta87",
  PAYMENT_TYPE: "status_mkmvbxtq",
  REPLACED_TEACHER: "board_relation_mknfrcyc",
  REPLACEMENT_DATE: "text_mkp6ta1q",
  PRIVATE_LESSONS: "board_relation_mm0x9vwe",
  LESSONS_COUNT: "numeric_mm0xxmbn",
  TOTAL_TRANSFER: "numeric_mkptwqxq",
} as const;

export const PAYMENT_TYPE_LABELS = {
  COURSE: "קורס",
  REPLACEMENT: "החלפה",
  OTHER: "אחר",
  PEDAGOGICAL: "ליווי פדגוגי",
  BACKOFFICE: "בקאופיס",
  PRIVATE_LESSONS: "שיעורים פרטיים",
} as const;

export const DEFAULT_STATUS_LABEL = "דרישת תשלום חדשה";

export const SUPPLIER_COLUMNS = {
  NAME: "name",
  SUPPLIER_NAME: "text_mkqrfpzx",
  BENEFICIARY_NAME: "text_mkrcb7gn",
  CATEGORY: "status",
  SUPPLIER_FILE_STATUS: "color_mkqr7v8z",
  TAX_VALIDITY_DATE: "date_mkqrepm1",
  EMAIL: "email_mkqrwpj6",
  ID_NUMBER: "text_mkqrjyty",
  EMPLOYMENT_STATUS: "color_mkqrr42c",
  TAX_DEDUCTION: "color_mkqrkb91",
  DOCUMENTS_FILES: "file_mkqrvzyf",
} as const;

export const SUPPLIER_FILE_STATUS_LABELS = {
  IN_PROCESS: "בתהליך קליטה",
  ALL_GOOD: "הכל פיקס",
  DOCUMENTS_EXPIRED: "מסמכים לא בתוקף",
  NEW: "חדש",
  WAITING_RECEIPT: "מחכה לקבלה",
  BLOCKED_MUST_RECEIPT: "חסום כי חייב קבלה",
} as const;

export const TEACHER_COLUMNS = {
  NAME: "name",
  EMAIL: "email",
  PHONE: "_____3",
  ID_NUMBER: "text2",
  ACTIVE_STATUS: "color_mkq1g95v",
  SUPPLIER_RELATION: "board_relation_mkqrgntw",
  SUPPLIER_FILE_STATUS: "color_mm0w6kxf",
  COURSES_RELATION: "connect_boards9",
  PRIVATE_LESSONS_RELATION: "board_relation_mm0wnmwq",
  PEDAGOGICAL_GUIDE: "status_1__1",
} as const;

export const TEACHER_SUPPLIER_STATUS_LABELS = {
  DOCUMENTS_EXPIRED: "מסמכים לא בתוקף",
  ALL_GOOD: "הכל פיקס",
  BLOCKED_MUST_RECEIPT: "חסום כי חייב קבלה",
  WAITING_RECEIPT: "מחכה לקבלה",
} as const;

export const COURSE_COLUMNS = {
  NAME: "name",
  TEACHER_RELATION: "link_to______________________",
  START_DATE: "date",
  END_DATE: "date2",
  TEACHING_RATE: "numeric",
  TRAVEL_RATE: "numeric1",
  COURSE_STATE: "status_mkkzjxkt",
  PAYMENT_STATUS: "color",
  LESSONS_COUNT: "numbers9",
  LEVEL: "numbers4",
} as const;

export const COURSE_STATE_LABELS = {
  UPCOMING: "לקראת פתיחה",
  RUNNING: "קורס רץ",
  FINISHED: "הסתיים",
  CANCELLED: "בוטל/נדחה",
} as const;

export const PRIVATE_LESSON_COLUMNS = {
  NAME: "name",
  TEACHER_RELATION: "board_relation_mkwa4jw7",
  STUDENT_NAME: "text_mkwawacp",
  STATUS: "status",
  LESSONS_PURCHASED: "numeric_mm0p7wx7",
  LESSONS_HELD: "formula_mm0yvry6",
  LESSONS_REMAINING: "formula_mm0y2gqp",
} as const;

export const PRIVATE_LESSON_STATUS_LABELS = {
  WAITING: "חדש ממתין לשיבוץ",
  ASSIGNED: "שובץ מורה",
  EMAIL_SENT: "נשלח מייל למורה",
  RUNNING: "תואם ורץ",
  FINISHED: "סיים",
  CANCELLED: "בוטל",
} as const;
