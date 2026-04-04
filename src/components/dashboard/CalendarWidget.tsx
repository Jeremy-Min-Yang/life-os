"use client";

import { useState, useEffect } from "react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { Calendar, MapPin } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { CalendarEvent } from "@/services/calendarService";

// Google Calendar color IDs → Tailwind classes
const COLOR_MAP: Record<string, string> = {
  "1": "bg-blue-500",
  "2": "bg-green-500",
  "3": "bg-purple-500",
  "4": "bg-red-500",
  "5": "bg-yellow-500",
  "6": "bg-orange-500",
  "7": "bg-cyan-500",
  "8": "bg-gray-500",
  "9": "bg-indigo-500",
  "10": "bg-emerald-500",
  "11": "bg-pink-500",
};
const DEFAULT_COLOR = "bg-brand-400";

function eventDayLabel(isoStr: string, isAllDay: boolean): string {
  const d = parseISO(isoStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, MMM d");
}

function eventTimeLabel(event: CalendarEvent): string {
  if (event.isAllDay) return "All day";
  return format(parseISO(event.start), "h:mm a");
}

// Group events by day label
function groupByDay(events: CalendarEvent[]): { label: string; events: CalendarEvent[] }[] {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const label = eventDayLabel(e.start, e.isAllDay);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(e);
  }
  return Array.from(map.entries()).map(([label, events]) => ({ label, events }));
}

export function CalendarWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setEvents(json.data ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const grouped = groupByDay(events);

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
        <span className="text-xs text-gray-500">Next 7 days</span>
      </CardHeader>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-surface-100 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-400 py-4 text-center">{error}</p>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <Calendar size={24} className="text-gray-600" />
          <p className="text-sm text-gray-600">No upcoming events</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ label, events: dayEvents }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {label}
              </p>
              <ul className="space-y-1">
                {dayEvents.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 py-1.5 px-1 rounded-lg hover:bg-surface-100 transition-colors">
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${COLOR_MAP[e.colorId ?? ""] ?? DEFAULT_COLOR}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 leading-snug truncate">{e.title}</p>
                      {e.location && (
                        <p className="flex items-center gap-1 text-xs text-gray-600 mt-0.5 truncate">
                          <MapPin size={10} />
                          {e.location}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 shrink-0 mt-0.5">
                      {eventTimeLabel(e)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
