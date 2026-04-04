"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { CalendarEvent } from "@/services/calendarService";
import { EventModal } from "@/components/calendar/EventModal";
import { cn } from "@/lib/utils/cn";

const COLOR_DOT: Record<string, string> = {
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
const DEFAULT_DOT = "bg-brand-400";

function eventColor(e: CalendarEvent) {
  return COLOR_DOT[e.colorId ?? ""] ?? DEFAULT_DOT;
}

// Build the 6-week grid for a given month
function buildGrid(current: Date): Date[] {
  const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });
  const days: Date[] = [];
  let d = start;
  while (d <= end) {
    days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

function getEventDate(e: CalendarEvent) {
  return parseISO(e.start);
}

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const loadEvents = useCallback(async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const year = date.getFullYear();
      const month = date.getMonth();
      const res = await fetch(`/api/calendar?year=${year}&month=${month}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setEvents(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEvents(current); }, [current, loadEvents]);

  const grid = buildGrid(current);

  function openNew(date: Date) {
    setEditingEvent(null);
    setSelectedDate(date);
    setModalOpen(true);
  }

  function openEdit(e: CalendarEvent) {
    setEditingEvent(e);
    setSelectedDate(null);
    setModalOpen(true);
  }

  async function handleSave(input: {
    title: string;
    start: string;
    end: string;
    isAllDay: boolean;
    location?: string;
    calendarId?: string;
  }) {
    if (editingEvent) {
      await fetch(`/api/calendar/${editingEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, calendarId: editingEvent.calendarId ?? "primary" }),
      });
    } else {
      await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    }
    setModalOpen(false);
    loadEvents(current);
  }

  async function handleDelete(event: CalendarEvent) {
    await fetch(
      `/api/calendar/${event.id}?calendarId=${encodeURIComponent(event.calendarId ?? "primary")}`,
      { method: "DELETE" }
    );
    setModalOpen(false);
    loadEvents(current);
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrent(subMonths(current, 1))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-100 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-xl font-bold text-white w-44 text-center">
            {format(current, "MMMM yyyy")}
          </h2>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-100 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => setCurrent(new Date())}
            className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded border border-surface-200 hover:border-surface-100"
          >
            Today
          </button>
        </div>
        <Button size="sm" onClick={() => openNew(new Date())}>
          <Plus size={14} />
          New event
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-4">{error}</p>
      )}

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={cn("grid grid-cols-7 border-l border-t border-surface-200", loading && "opacity-50")}>
        {grid.map((day) => {
          const dayEvents = events.filter((e) => isSameDay(getEventDate(e), day));
          const isCurrentMonth = isSameMonth(day, current);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[110px] border-r border-b border-surface-200 p-1.5 cursor-pointer group",
                !isCurrentMonth && "bg-surface-50/30",
                "hover:bg-surface-100/50 transition-colors"
              )}
              onClick={() => openNew(day)}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    today
                      ? "bg-brand-500 text-white font-bold"
                      : isCurrentMonth
                      ? "text-gray-300"
                      : "text-gray-600"
                  )}
                >
                  {format(day, "d")}
                </span>
                <Plus
                  size={12}
                  className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                    className="w-full text-left flex items-center gap-1 px-1 py-0.5 rounded hover:bg-surface-200 transition-colors"
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", eventColor(e))} />
                    <span className="text-xs text-gray-300 truncate leading-tight">
                      {!e.isAllDay && (
                        <span className="text-gray-500 mr-1">
                          {format(parseISO(e.start), "h:mm")}
                        </span>
                      )}
                      {e.title}
                    </span>
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-xs text-gray-600 px-1">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event modal */}
      {modalOpen && (
        <EventModal
          event={editingEvent}
          defaultDate={selectedDate ?? new Date()}
          onSave={handleSave}
          onDelete={editingEvent ? () => handleDelete(editingEvent) : undefined}
          onClose={() => setModalOpen(false)}
        />
      )}
    </AppShell>
  );
}
