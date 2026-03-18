// GET    /api/tasks/:id  — get single task
// PATCH  /api/tasks/:id  — update task
// DELETE /api/tasks/:id  — delete task

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getTaskById, updateTask, deleteTask, toggleTaskCompletion } from "@/services/tasks";
import { UpdateTaskSchema } from "@/lib/validation/schemas";
import { apiSuccess, apiError } from "@/types";
import { withAuth, withRateLimit, handleZodError } from "@/lib/utils/api";

const GET = withRateLimit(
  withAuth(async (_req, { params }) => {
    const task = await getTaskById(params.id);
    if (!task) return NextResponse.json(apiError("Task not found"), { status: 404 });
    return NextResponse.json(apiSuccess(task));
  })
);

const PATCH = withRateLimit(
  withAuth(async (req, { params }) => {
    try {
      const body = await req.json();

      // Special action: toggle completion
      if (body.__action === "toggle") {
        const task = await toggleTaskCompletion(params.id);
        return NextResponse.json(apiSuccess(task));
      }

      const validated = UpdateTaskSchema.parse({ ...body, id: params.id });
      const task = await updateTask(validated);
      return NextResponse.json(apiSuccess(task));
    } catch (err) {
      if (err instanceof ZodError) return handleZodError(err);
      if (err instanceof Error && err.message.includes("not found"))
        return NextResponse.json(apiError(err.message), { status: 404 });
      return NextResponse.json(apiError(String(err)), { status: 500 });
    }
  })
);

const DELETE = withRateLimit(
  withAuth(async (_req, { params }) => {
    try {
      await deleteTask(params.id);
      return NextResponse.json(apiSuccess(null), { status: 200 });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found"))
        return NextResponse.json(apiError(err.message), { status: 404 });
      return NextResponse.json(apiError(String(err)), { status: 500 });
    }
  })
);

export { GET, PATCH, DELETE };
