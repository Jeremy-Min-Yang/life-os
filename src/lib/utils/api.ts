// ============================================================
// API Route Utilities
//
// withAuth: wraps any route handler with session check.
// withRateLimit: simple in-memory rate limiter per IP.
// parseQuery: type-safe URL search param parsing.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { ZodSchema, ZodError } from "zod";
import { authOptions } from "@/lib/auth/config";
import { apiError } from "@/types";

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Record<string, string>; session: Session }
) => Promise<NextResponse>;

// ---- Auth Guard --------------------------------------------

export function withAuth(handler: RouteHandler) {
  return async (req: NextRequest, ctx: { params: Record<string, string> }) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(apiError("Unauthorized"), { status: 401 });
    }
    return handler(req, { ...ctx, session });
  };
}

// ---- Rate Limiter ------------------------------------------
// Per-instance, per-IP. Not distributed. For SaaS: use Upstash Redis.

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function withRateLimit(
  handler: (req: NextRequest, ctx: { params: Record<string, string> }) => Promise<NextResponse>,
  opts = { max: 60, windowMs: 60_000 } // 60 req/min per IP
) {
  return async (req: NextRequest, ctx: { params: Record<string, string> }) => {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + opts.windowMs });
    } else {
      entry.count++;
      if (entry.count > opts.max) {
        return NextResponse.json(apiError("Too many requests"), { status: 429 });
      }
    }

    return handler(req, ctx);
  };
}

// ---- Zod error → HTTP 422 ----------------------------------

export function handleZodError(error: ZodError): NextResponse {
  return NextResponse.json(
    {
      ...apiError("Validation failed"),
      details: error.flatten().fieldErrors,
    },
    { status: 422 }
  );
}

// ---- Query param helper ------------------------------------

export function parseQueryParams(
  req: NextRequest,
  schema: ZodSchema
): { success: true; data: unknown } | { success: false; response: NextResponse } {
  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => { params[k] = v; });
  const result = schema.safeParse(params);
  if (!result.success) {
    return { success: false, response: handleZodError(result.error) };
  }
  return { success: true, data: result.data };
}
