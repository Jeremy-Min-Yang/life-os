// ============================================================
// Calendar Service
//
// Reads and writes Google Calendar events using the user's
// OAuth access token stored in the NextAuth session.
// ============================================================

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO datetime or date
  end: string;
  isAllDay: boolean;
  location?: string;
  calendarName?: string;
  calendarId?: string;
  colorId?: string;
}

export interface CalendarEventInput {
  title: string;
  start: string; // ISO datetime (timed) or YYYY-MM-DD (all-day)
  end: string;
  isAllDay: boolean;
  location?: string;
  calendarId?: string; // defaults to "primary"
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
  colorId?: string;
  status?: string;
}

interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string;
}

// ---- Read --------------------------------------------------

export async function fetchCalendarList(accessToken: string): Promise<GoogleCalendarListEntry[]> {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error("Failed to fetch calendar list");
  const data = await res.json();
  return data.items ?? [];
}

export async function fetchUpcomingEvents(
  accessToken: string,
  daysAhead = 6
): Promise<CalendarEvent[]> {
  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setHours(0, 0, 0, 0);
  const timeMax = new Date(timeMin);
  timeMax.setDate(timeMax.getDate() + daysAhead + 1);

  return fetchEventsInRange(accessToken, timeMin, timeMax);
}

export async function fetchMonthEvents(
  accessToken: string,
  year: number,
  month: number // 0-indexed
): Promise<CalendarEvent[]> {
  const timeMin = new Date(year, month, 1);
  const timeMax = new Date(year, month + 1, 1);
  return fetchEventsInRange(accessToken, timeMin, timeMax);
}

async function fetchEventsInRange(
  accessToken: string,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const calendars = await fetchCalendarList(accessToken);

  const eventArrays = await Promise.all(
    calendars.map(async (cal) => {
      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "200",
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
          calendarId: cal.id,
          colorId: e.colorId,
        }));
    })
  );

  return eventArrays.flat().sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
}

// ---- Write -------------------------------------------------

function buildGoogleEventBody(input: CalendarEventInput) {
  if (input.isAllDay) {
    // All-day events use date (YYYY-MM-DD), not dateTime
    const startDate = input.start.slice(0, 10);
    // For all-day, Google end date is exclusive — add 1 day
    const endDate = (() => {
      const d = new Date(input.end.slice(0, 10) + "T00:00:00");
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })();
    return {
      summary: input.title,
      location: input.location,
      start: { date: startDate },
      end: { date: endDate },
    };
  }
  return {
    summary: input.title,
    location: input.location,
    start: { dateTime: input.start },
    end: { dateTime: input.end },
  };
}

export async function createEvent(
  accessToken: string,
  input: CalendarEventInput
): Promise<CalendarEvent> {
  const calendarId = input.calendarId ?? "primary";
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildGoogleEventBody(input)),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? "Failed to create event");
  }
  const e: GoogleEvent = await res.json();
  return {
    id: e.id,
    title: e.summary ?? "(No title)",
    start: e.start.dateTime ?? e.start.date ?? "",
    end: e.end.dateTime ?? e.end.date ?? "",
    isAllDay: !e.start.dateTime,
    location: e.location,
    calendarId,
  };
}

export async function updateEvent(
  accessToken: string,
  eventId: string,
  calendarId: string,
  input: CalendarEventInput
): Promise<CalendarEvent> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildGoogleEventBody(input)),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? "Failed to update event");
  }
  const e: GoogleEvent = await res.json();
  return {
    id: e.id,
    title: e.summary ?? "(No title)",
    start: e.start.dateTime ?? e.start.date ?? "",
    end: e.end.dateTime ?? e.end.date ?? "",
    isAllDay: !e.start.dateTime,
    location: e.location,
    calendarId,
  };
}

export async function deleteEvent(
  accessToken: string,
  eventId: string,
  calendarId: string
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok && res.status !== 204 && res.status !== 410) {
    throw new Error("Failed to delete event");
  }
}
