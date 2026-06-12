// Local fallback for training materials, used until a Monday materials board
// is configured (PORTAL_MATERIALS_BOARD_ID + MATERIALS.URL mapping).
// URLs are honest placeholders pointing to the relevant service homepages —
// replace them with the real links or configure the Monday board.

import type { MaterialLink } from "@/lib/monday/portal-types";

export const LOCAL_MATERIALS: MaterialLink[] = [
  {
    id: "local-1",
    title: "תיקיית חומרי לימוד",
    description: "כל מערכי השיעור והמצגות של מדרסה במקום אחד",
    url: "https://drive.google.com",
    category: "חומרי לימוד",
  },
  {
    id: "local-2",
    title: "מדריך למורה חדש",
    description: "כל מה שצריך לדעת בשבועות הראשונים כמורה במדרסה",
    url: "https://drive.google.com",
    category: "מסמכים",
  },
  {
    id: "local-3",
    title: "ערכת זום למורים",
    description: "הגדרות מומלצות וטיפים להוראה מרחוק בזום",
    url: "https://zoom.us",
    category: "כלים",
  },
  {
    id: "local-4",
    title: "טפסים ומסמכי משרד",
    description: "טפסים אדמיניסטרטיביים, אישורים והנחיות למורים",
    url: "https://drive.google.com",
    category: "מסמכים",
  },
  {
    id: "local-5",
    title: "אתר מדרסה",
    description: "האתר הראשי של מדרסה — קורסים, חדשות ועדכונים",
    url: "https://madrasafree.com",
    category: "קישורים",
  },
  {
    id: "local-6",
    title: "קהילת המורים",
    description: "קבוצת הוואטסאפ של קהילת המורים של מדרסה",
    url: "https://chat.whatsapp.com",
    category: "קישורים",
  },
];
