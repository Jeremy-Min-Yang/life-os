import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getDiaryEntries, updateDiaryEntry, deleteDiaryEntry } from "@/services/diary";
import { UpdateDiarySchema } from "@/lib/validation/schemas";
import { apiSuccess, apiError } from "@/types";
import { withAuth, withRateLimit, handleZodError } from "@/lib/utils/api";

const GET = withRateLimit(
  withAuth(async (_req, { params }) => {
    const entries = await getDiaryEntries();
    const entry = entries.find((e) => e.id === params.id);
    if (!entry) return NextResponse.json(apiError("Entry not found"), { status: 404 });
    return NextResponse.json(apiSuccess(entry));
  })
);

const PATCH = withRateLimit(
  withAuth(async (req, { params }) => {
    try {
      const body = await req.json();
      const validated = UpdateDiarySchema.parse({ ...body, id: params.id });
      const entry = await updateDiaryEntry(validated);
      return NextResponse.json(apiSuccess(entry));
    } catch (err) {
      if (err instanceof ZodError) return handleZodError(err);
      return NextResponse.json(apiError(String(err)), { status: 500 });
    }
  })
);

const DELETE = withRateLimit(
  withAuth(async (_req, { params }) => {
    try {
      await deleteDiaryEntry(params.id);
      return NextResponse.json(apiSuccess(null));
    } catch (err) {
      return NextResponse.json(apiError(String(err)), { status: 500 });
    }
  })
);

export { GET, PATCH, DELETE };
