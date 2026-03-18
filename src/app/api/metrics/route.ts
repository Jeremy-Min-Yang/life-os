import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getMetrics, upsertMetrics } from "@/services/metrics";
import { MetricsFilterSchema, CreateMetricsSchema } from "@/lib/validation/schemas";
import { apiSuccess, apiError } from "@/types";
import { withAuth, withRateLimit, parseQueryParams, handleZodError } from "@/lib/utils/api";

const GET = withRateLimit(
  withAuth(async (req) => {
    const parsed = parseQueryParams(req, MetricsFilterSchema);
    if (!parsed.success) return parsed.response;
    const data = await getMetrics(parsed.data as Parameters<typeof getMetrics>[0]);
    return NextResponse.json(apiSuccess(data));
  })
);

// POST upserts by date (idempotent daily logging)
const POST = withRateLimit(
  withAuth(async (req) => {
    try {
      const body = await req.json();
      const validated = CreateMetricsSchema.parse(body);
      const data = await upsertMetrics(validated);
      return NextResponse.json(apiSuccess(data), { status: 201 });
    } catch (err) {
      if (err instanceof ZodError) return handleZodError(err);
      return NextResponse.json(apiError(String(err)), { status: 500 });
    }
  })
);

export { GET, POST };
