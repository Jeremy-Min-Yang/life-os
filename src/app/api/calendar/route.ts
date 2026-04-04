// GET /api/calendar — upcoming Google Calendar events

import { NextResponse } from "next/server";
import { fetchUpcomingEvents } from "@/services/calendarService";
import { withAuth, withRateLimit } from "@/lib/utils/api";
import { apiSuccess, apiError } from "@/types";

const GET = withRateLimit(
  withAuth(async (_req, { session }) => {
    const accessToken = (session as typeof session & { accessToken?: string }).accessToken;
    if (!accessToken) {
      return NextResponse.json(apiError("No calendar access token — please sign out and sign in again"), { status: 401 });
    }

    const events = await fetchUpcomingEvents(accessToken, 6);
    return NextResponse.json(apiSuccess(events));
  })
);

export { GET };
