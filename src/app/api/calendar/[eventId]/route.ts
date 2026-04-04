// PATCH /api/calendar/[eventId] — update an event
// DELETE /api/calendar/[eventId] — delete an event

import { NextResponse } from "next/server";
import { updateEvent, deleteEvent } from "@/services/calendarService";
import { withAuth, withRateLimit } from "@/lib/utils/api";
import { apiSuccess, apiError } from "@/types";

type SessionWithToken = { accessToken?: string };

function getToken(session: object): string | null {
  return (session as SessionWithToken).accessToken ?? null;
}

const PATCH = withRateLimit(
  withAuth(async (req, { session, params }) => {
    const token = getToken(session);
    if (!token) {
      return NextResponse.json(apiError("No calendar access token"), { status: 401 });
    }
    const { eventId } = params;
    const body = await req.json();
    const { calendarId, ...input } = body;
    const event = await updateEvent(token, eventId, calendarId ?? "primary", input);
    return NextResponse.json(apiSuccess(event));
  })
);

const DELETE = withRateLimit(
  withAuth(async (req, { session, params }) => {
    const token = getToken(session);
    if (!token) {
      return NextResponse.json(apiError("No calendar access token"), { status: 401 });
    }
    const { eventId } = params;
    const { searchParams } = req.nextUrl;
    const calendarId = searchParams.get("calendarId") ?? "primary";
    await deleteEvent(token, eventId, calendarId);
    return NextResponse.json(apiSuccess(null));
  })
);

export { PATCH, DELETE };
