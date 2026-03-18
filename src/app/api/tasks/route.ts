// GET  /api/tasks       — list tasks (with filters)
// POST /api/tasks       — create task

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getTasks, createTask } from "@/services/tasks";
import { TaskFilterSchema, CreateTaskSchema } from "@/lib/validation/schemas";
import { apiSuccess, apiError } from "@/types";
import { withAuth, withRateLimit, parseQueryParams, handleZodError } from "@/lib/utils/api";

const GET = withRateLimit(
  withAuth(async (req) => {
    const parsed = parseQueryParams(req, TaskFilterSchema);
    if (!parsed.success) return parsed.response;

    const tasks = await getTasks(parsed.data as Parameters<typeof getTasks>[0]);
    return NextResponse.json(apiSuccess(tasks));
  })
);

const POST = withRateLimit(
  withAuth(async (req) => {
    try {
      const body = await req.json();
      const validated = CreateTaskSchema.parse(body);
      const task = await createTask(validated);
      return NextResponse.json(apiSuccess(task), { status: 201 });
    } catch (err) {
      if (err instanceof ZodError) return handleZodError(err);
      return NextResponse.json(apiError(String(err)), { status: 500 });
    }
  })
);

export { GET, POST };
