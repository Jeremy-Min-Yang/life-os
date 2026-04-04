// ============================================================
// Calendar Service
//
// Fetches Google Calendar events using the user's OAuth access
// token stored in the NextAuth session. Follows the same
// service-layer pattern as other services — API routes and
// components never call Google APIs directly.
// ============================================================

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO datetime or date
  end: string;
  isAllDay: boolean;
  location?: string;
  calendarName?: string;
  colorId?: string;
}

interface GoogleEventDateTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  start: GoogleEventDateTime;
  end: GoogleEventDateTime;
  location?: string;
  organizer?: { displayName?: string };
  colorId?: string;
  status?: string;
}

interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
}

// Fetch events for today + the next N days (default: 6 more days = full week view)
export async function fetchUpcomingEvents(
  accessToken: string,
  daysAhead = 6
): Promise<CalendarEvent[]> {
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setHours(0, 0, 0, 0);

  const timeMax = new Date(timeMin);
  timeMax.setDate(timeMax.getDate() + daysAhead + 1);

  // Fetch all calendars the user has access to
  const calListRes = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!calListRes.ok) throw new Error("Failed to fetch calendar list");
  const calList = await calListRes.json();
  const calendars: GoogleCalendarListEntry[] = calList.items ?? [];

  // Fetch events from all calendars in parallel
  const eventArrays = await Promise.all(
    calendars.map(async (cal) => {
      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "50",
      });
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items ?? [])
        .filter((e: GoogleEvent) => e.status !== "cancelled")
        .map((e: GoogleEvent): CalendarEvent => ({
          id: e.id,
          title: e.summary ?? "(No title)",
          start: e.start.dateTime ?? e.start.date ?? "",
          end: e.end.dateTime ?? e.end.date ?? "",
          isAllDay: !e.start.dateTime,
          location: e.location,
          calendarName: cal.summary,
          colorId: e.colorId,
        }));
    })
  );

  // Flatten and sort by start time
  const all = eventArrays.flat().sort((a, b) =>
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  return all;
}
