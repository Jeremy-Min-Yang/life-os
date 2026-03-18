"use client";

import { useEffect, useState } from "react";
import {
  eachDayOfInterval,
  subDays,
  format,
  startOfWeek,
  endOfWeek,
  isFuture,
} from "date-fns";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

interface HabitData {
  trainingDates: string[];
  journalDates: string[];
}

// Build the week grid: array of 7-day arrays (Sun–Sat), covering the past ~52 weeks
function buildWeekGrid(): Date[][] {
  const today = new Date();
  const gridStart = startOfWeek(subDays(today, 364), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(today, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

// Find which week index each new month first appears in
function buildMonthLabels(weeks: Date[][]): { weekIndex: number; label: string }[] {
  const labels: { weekIndex: number; label: string }[] = [];
  weeks.forEach((week, i) => {
    const firstOfMonth = week.find((d) => d.getDate() === 1);
    if (firstOfMonth) {
      labels.push({ weekIndex: i, label: format(firstOfMonth, "MMM") });
    }
  });
  return labels;
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

interface HabitGridProps {
  label: string;
  activeDates: Set<string>;
  color: string;
  weeks: Date[][];
  monthLabels: { weekIndex: number; label: string }[];
}

function HabitGrid({ label, activeDates, color, weeks, monthLabels }: HabitGridProps) {
  return (
    <div>
      {/* Legend row */}
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium text-gray-400">{label}</span>
      </div>

      <div className="flex gap-1 min-w-0">
        {/* Day-of-week labels */}
        <div className="flex flex-col justify-around shrink-0 pr-1" style={{ paddingTop: "18px" }}>
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="text-[9px] text-gray-600 leading-none h-[10px] flex items-center w-6 justify-end">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-x-auto">
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1 h-[14px]">
            {weeks.map((_, i) => {
              const ml = monthLabels.find((m) => m.weekIndex === i);
              return (
                <div key={i} className="shrink-0 w-[10px] text-[9px] text-gray-500 overflow-visible whitespace-nowrap">
                  {ml?.label ?? ""}
                </div>
              );
            })}
          </div>

          {/* Rows: one per day-of-week */}
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
            <div key={dow} className="flex gap-[3px] mb-[3px]">
              {weeks.map((week, wi) => {
                const day = week[dow];
                const dateStr = format(day, "yyyy-MM-dd");
                const future = isFuture(day);
                const active = !future && activeDates.has(dateStr);

                return (
                  <div
                    key={wi}
                    title={future ? undefined : `${dateStr}${active ? " ✓" : ""}`}
                    className={cn(
                      "shrink-0 w-[10px] h-[10px] rounded-sm",
                      future ? "opacity-0" : !active ? "bg-surface-100" : ""
                    )}
                    style={active ? { backgroundColor: color } : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HabitTrackerWidget() {
  const [data, setData] = useState<HabitData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/habits")
      .then((r) => r.json())
      .then((json) => {
        setData(json.data ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const weeks = buildWeekGrid();
  const monthLabels = buildMonthLabels(weeks);

  const trainingSet = new Set(data?.trainingDates ?? []);
  const journalSet = new Set(data?.journalDates ?? []);

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Habit Tracker</CardTitle>
        <span className="text-xs text-gray-600">Past 52 weeks</span>
      </CardHeader>

      {loading ? (
        <div className="space-y-6">
          <div className="h-20 rounded-lg bg-surface-100 animate-pulse" />
          <div className="h-20 rounded-lg bg-surface-100 animate-pulse" />
        </div>
      ) : (
        <div className="space-y-6">
          <HabitGrid
            label="Physical Activity"
            activeDates={trainingSet}
            color="#10b981"
            weeks={weeks}
            monthLabels={monthLabels}
          />
          <HabitGrid
            label="Journal Entry"
            activeDates={journalSet}
            color="#8b5cf6"
            weeks={weeks}
            monthLabels={monthLabels}
          />
        </div>
      )}
    </Card>
  );
}
