import { NextResponse } from "next/server";

import { MondayApiError } from "@/lib/monday/client";
import { getActiveTeachers } from "@/lib/monday/queries";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET() {
  try {
    const teachers = await getActiveTeachers();
    return NextResponse.json(teachers);
  } catch (error) {
    if (error instanceof MondayApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json(
      { error: "לא הצלחנו לטעון את רשימת המורים." },
      { status: 500 },
    );
  }
}
