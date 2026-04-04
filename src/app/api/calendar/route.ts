// GET /api/calendar?year=&month=  — fetch events for a month (or upcoming 7 days)
// POST /api/calendar              — create an event

import { NextResponse } from "next/server";
import { fetchUpcomingEvents, fetchMonthEvents, createEvent } from "@/services/calendarService";
import { withAuth, withRateLimit } from "@/lib/utils/api";
import { apiSuccess, apiError } from "@/types";

type SessionWithToken = { accessToken?: string };

function getToken(session: object): string | null {
  return (session as SessionWithToken).accessToken ?? null;
}

const GET = withRateLimit(
  withAuth(async (req, { session }) => {
    const token = getToken(session);
    if (!token) {
      return NextResponse.json(
        apiError("No calendar access token — please sign out and sign in again"),
        { status: 401 }
      );
    }

    try {
      const { searchParams } = req.nextUrl;
      const year = searchParams.get("year");
      const month = searchParams.get("month");

      const events =
        year && month
          ? await fetchMonthEvents(token, parseInt(year), parseInt(month))
          : await fetchUpcomingEvents(token, 6);

      return NextResponse.json(apiSuccess(events));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch calendar events";
      return NextResponse.json(apiError(msg), { status: 500 });
    }
  })
);

const POST = withRateLimit(
  withAuth(async (req, { session }) => {
    const token = getToken(session);
    if (!token) {
      return NextResponse.json(apiError("No calendar access token"), { status: 401 });
    }
    try {
      const body = await req.json();
      const event = await createEvent(token, body);
      return NextResponse.json(apiSuccess(event), { status: 201 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create event";
      return NextResponse.json(apiError(msg), { status: 500 });
    }
  })
);

export { GET, POST };
