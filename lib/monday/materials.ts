// Portal training-materials services. Server-side only.
//
// When a Monday materials board is configured (PORTAL_MATERIALS_BOARD_ID env
// + MATERIALS.URL column mapping) materials are read from Monday; otherwise
// (including preview mode) the curated local fallback list is returned.

import { unstable_cache } from "next/cache";

import { fetchQuery } from "@/lib/monday/client";
import { LOCAL_MATERIALS } from "@/lib/monday/materials-local";
import { isMondayPreviewMode } from "@/lib/monday/mock";
import { getMaterialsBoardId, MATERIAL_COLUMNS } from "@/lib/monday/portal-mappings";
import type { MaterialLink } from "@/lib/monday/portal-types";

type MaterialColumnValue = {
  id: string;
  text: string | null;
  value: unknown;
  label?: string | null;
  url?: string | null;
};

type MaterialItemResponse = {
  id: string;
  name: string;
  column_values: MaterialColumnValue[];
};

type MaterialsBoardResponse = {
  boards: Array<{
    items_page: {
      items: MaterialItemResponse[];
    };
  }>;
};

const MATERIAL_COLUMN_VALUE_FIELDS = `
  id
  text
  value
  ... on StatusValue {
    label
  }
  ... on LinkValue {
    url
  }
`;

function getMappedMaterialColumnIds(): string[] {
  return Object.values(MATERIAL_COLUMNS).filter((columnId): columnId is string =>
    Boolean(columnId),
  );
}

function getColumn(item: MaterialItemResponse, columnId: string | null) {
  if (!columnId) {
    return undefined;
  }

  return item.column_values.find((column) => column.id === columnId);
}

function parseMaterialUrl(column: MaterialColumnValue | undefined): string | null {
  if (!column) {
    return null;
  }

  if (typeof column.url === "string" && column.url) {
    return column.url;
  }

  if (typeof column.value === "string" && column.value) {
    try {
      const parsed = JSON.parse(column.value) as { url?: string | null };

      if (typeof parsed?.url === "string" && parsed.url) {
        return parsed.url;
      }
    } catch {
      // Fall back to text below.
    }
  }

  return column.text?.trim() || null;
}

function parseMaterialItem(item: MaterialItemResponse): MaterialLink | null {
  const url = parseMaterialUrl(getColumn(item, MATERIAL_COLUMNS.URL));

  if (!url) {
    return null;
  }

  const categoryColumn = getColumn(item, MATERIAL_COLUMNS.CATEGORY);

  return {
    id: `monday-${item.id}`,
    title: item.name,
    description: getColumn(item, MATERIAL_COLUMNS.DESCRIPTION)?.text?.trim() || null,
    url,
    category: categoryColumn?.label || categoryColumn?.text?.trim() || "כללי",
  };
}

const getMondayMaterialsCached = unstable_cache(
  async (boardId: number): Promise<MaterialLink[]> => {
    const query = `
      query GetPortalTrainingMaterials($boardId: [ID!], $columnIds: [String!]) {
        boards(ids: $boardId) {
          items_page(limit: 500) {
            items {
              id
              name
              column_values(ids: $columnIds) {
                ${MATERIAL_COLUMN_VALUE_FIELDS}
              }
            }
          }
        }
      }
    `;

    const response = await fetchQuery<MaterialsBoardResponse>(query, {
      boardId: [boardId],
      columnIds: getMappedMaterialColumnIds(),
    });

    return (response.boards[0]?.items_page.items || [])
      .map(parseMaterialItem)
      .filter((material): material is MaterialLink => material !== null);
  },
  ["portal-training-materials"],
  { revalidate: 600 },
);

export async function getTrainingMaterials(): Promise<{
  materials: MaterialLink[];
  source: "monday" | "local";
}> {
  const boardId = getMaterialsBoardId();

  if (isMondayPreviewMode() || boardId === null || !MATERIAL_COLUMNS.URL) {
    return { materials: LOCAL_MATERIALS, source: "local" };
  }

  try {
    const materials = await getMondayMaterialsCached(boardId);

    // An empty configured board is less useful than the curated fallback.
    if (!materials.length) {
      return { materials: LOCAL_MATERIALS, source: "local" };
    }

    return { materials, source: "monday" };
  } catch (error) {
    console.warn("[Portal Materials] Falling back to local materials list", error);
    return { materials: LOCAL_MATERIALS, source: "local" };
  }
}
