import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { updateTrainingSession, deleteTrainingSession } from "@/services/training";
import { UpdateTrainingSchema } from "@/lib/validation/schemas";
import { apiSuccess, apiError } from "@/types";
import { withAuth, withRateLimit, handleZodError } from "@/lib/utils/api";

const PATCH = withRateLimit(
  withAuth(async (req, { params }) => {
    try {
      const body = await req.json();
      const validated = UpdateTrainingSchema.parse({ ...body, id: params.id });
      const session = await updateTrainingSession(validated);
      return NextResponse.json(apiSuccess(session));
    } catch (err) {
      if (err instanceof ZodError) return handleZodError(err);
      return NextResponse.json(apiError(String(err)), { status: 500 });
    }
  })
);

const DELETE = withRateLimit(
  withAuth(async (_req, { params }) => {
    try {
      await deleteTrainingSession(params.id);
      return NextResponse.json(apiSuccess(null));
    } catch (err) {
      return NextResponse.json(apiError(String(err)), { status: 500 });
    }
  })
);

export { PATCH, DELETE };
