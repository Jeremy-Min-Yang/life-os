import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getDiaryEntries, createDiaryEntry } from "@/services/diary";
import { DiaryFilterSchema, CreateDiarySchema } from "@/lib/validation/schemas";
import { apiSuccess, apiError } from "@/types";
import { withAuth, withRateLimit, parseQueryParams, handleZodError } from "@/lib/utils/api";

const GET = withRateLimit(
  withAuth(async (req) => {
    const parsed = parseQueryParams(req, DiaryFilterSchema);
    if (!parsed.success) return parsed.response;
    const entries = await getDiaryEntries(parsed.data as Parameters<typeof getDiaryEntries>[0]);
    return NextResponse.json(apiSuccess(entries));
  })
);

const POST = withRateLimit(
  withAuth(async (req) => {
    try {
      const body = await req.json();
      const validated = CreateDiarySchema.parse(body);
      const entry = await createDiaryEntry(validated);
      return NextResponse.json(apiSuccess(entry), { status: 201 });
    } catch (err) {
      if (err instanceof ZodError) return handleZodError(err);
      if (err instanceof Error && err.message.includes("already exists"))
        return NextResponse.json(apiError(err.message), { status: 409 });
      return NextResponse.json(apiError(String(err)), { status: 500 });
    }
  })
);

export { GET, POST };
