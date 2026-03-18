import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getTrainingSessions, createTrainingSession } from "@/services/training";
import { TrainingFilterSchema, CreateTrainingSchema } from "@/lib/validation/schemas";
import { apiSuccess, apiError } from "@/types";
import { withAuth, withRateLimit, parseQueryParams, handleZodError } from "@/lib/utils/api";

const GET = withRateLimit(
  withAuth(async (req) => {
    const parsed = parseQueryParams(req, TrainingFilterSchema);
    if (!parsed.success) return parsed.response;
    const sessions = await getTrainingSessions(parsed.data as Parameters<typeof getTrainingSessions>[0]);
    return NextResponse.json(apiSuccess(sessions));
  })
);

const POST = withRateLimit(
  withAuth(async (req) => {
    try {
      const body = await req.json();
      const validated = CreateTrainingSchema.parse(body);
      const session = await createTrainingSession(validated);
      return NextResponse.json(apiSuccess(session), { status: 201 });
    } catch (err) {
      if (err instanceof ZodError) return handleZodError(err);
      return NextResponse.json(apiError(String(err)), { status: 500 });
    }
  })
);

export { GET, POST };
