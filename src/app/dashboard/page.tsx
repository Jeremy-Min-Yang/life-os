"use client";

import { format } from "date-fns";
import { AppShell } from "@/components/layout/AppShell";
import { TasksWidget } from "@/components/dashboard/TasksWidget";
import { TrainingWidget } from "@/components/dashboard/TrainingWidget";
import { HabitTrackerWidget } from "@/components/dashboard/HabitTrackerWidget";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { useDashboard } from "@/hooks/useDashboard";
import { BookOpen, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function DashboardPage() {
  const { data, loading, error, fromCache, refetch } = useDashboard();

  const today = format(new Date(), "EEEE, MMMM d");

  if (error) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">{today}</h2>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? "Loading..." : fromCache ? "Cached data" : "Live data"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={refetch}
          disabled={loading}
          title="Refresh dashboard"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-surface-50 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tasks */}
          <TasksWidget
            tasks={data.todayTasks}
            onToggle={async (id) => {
              await fetch(`/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ __action: "toggle" }),
              });
              refetch();
            }}
          />

          {/* Training */}
          <TrainingWidget
            volume={data.weeklyTrainingSummary}
            load={data.trainingLoad}
          />

          {/* Diary */}
          <Card>
            <CardHeader>
              <CardTitle>Latest Journal</CardTitle>
              <Link href="/diary" className="text-xs text-brand-400 hover:text-brand-300">
                View all →
              </Link>
            </CardHeader>
            {data.recentDiaryEntry ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-medium text-white">
                    {data.recentDiaryEntry.title}
                  </p>
                  <span className="text-sm font-bold text-brand-400" title={`Mood: ${data.recentDiaryEntry.mood}/5`}>
                    {data.recentDiaryEntry.mood}/5
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{data.recentDiaryEntry.date}</p>
                <p className="text-sm text-gray-400 line-clamp-4 leading-relaxed">
                  {data.recentDiaryEntry.content.slice(0, 280)}
                  {data.recentDiaryEntry.content.length > 280 ? "..." : ""}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <BookOpen size={24} className="text-gray-600" />
                <p className="text-sm text-gray-600">No journal entries yet</p>
                <Link href="/diary">
                  <Button size="sm" variant="outline">Write today&apos;s entry</Button>
                </Link>
              </div>
            )}
          </Card>

          {/* Habit Tracker */}
          <HabitTrackerWidget />

          {/* Calendar */}
          <CalendarWidget />
        </div>
      ) : null}
    </AppShell>
  );
}
