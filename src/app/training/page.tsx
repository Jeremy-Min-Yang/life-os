"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TrainingForm } from "@/components/training/TrainingForm";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TrainingSession, ApiResponse } from "@/types";
import { Plus, Trash2, Clock, MapPin } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { format, subDays } from "date-fns";

const sportEmoji: Record<TrainingSession["sport"], string> = {
  swim: "🏊",
  bike: "🚴",
  run: "🏃",
};

const sportColor: Record<TrainingSession["sport"], string> = {
  swim: "#22d3ee",
  bike: "#facc15",
  run: "#fb923c",
};

export default function TrainingPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const startDate = format(subDays(new Date(), 60), "yyyy-MM-dd");
    const res = await fetch(`/api/training?startDate=${startDate}&limit=50`);
    const json: ApiResponse<TrainingSession[]> = await res.json();
    setSessions(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const deleteSession = async (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/training/${id}`, { method: "DELETE" });
  };

  // Build weekly TSS chart data (last 8 weeks)
  const chartData = buildWeeklyChartData(sessions);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Training Log</h2>
        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          <Plus size={14} />
          Log Session
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 animate-slide-up">
          <TrainingForm
            onSubmit={async (data) => {
              await fetch("/api/training", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              setShowForm(false);
              fetchSessions();
            }}
            onCancel={() => setShowForm(false)}
          />
        </Card>
      )}

      {/* Weekly Volume Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Weekly Volume (TSS)</CardTitle>
        </CardHeader>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3244" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: "#6b7280", fontSize: 11 }} />
            <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1a1d27", border: "1px solid #2e3244", borderRadius: "8px" }}
              labelStyle={{ color: "#e5e7eb" }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="swim" fill="#22d3ee" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="bike" fill="#facc15" stackId="a" />
            <Bar dataKey="run" fill="#fb923c" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Session List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-surface-50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-4 px-4 py-3 rounded-lg bg-surface-50 border border-surface-200 group hover:border-surface-200 transition-colors"
            >
              <span className="text-2xl">{sportEmoji[session.sport]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{session.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500">{session.date}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={11} /> {session.durationMinutes}min
                  </span>
                  {session.distanceKm && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin size={11} /> {session.distanceKm}km
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={session.rpe >= 8 ? "red" : session.rpe >= 6 ? "yellow" : "green"}
                >
                  RPE {session.rpe}
                </Badge>
                {session.tss && (
                  <span className="text-xs text-gray-500">TSS {session.tss}</span>
                )}
                <button
                  onClick={() => deleteSession(session.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-sm">No sessions logged yet</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowForm(true)}>
                Log your first session
              </Button>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

// Build stacked bar chart data: weekly TSS per sport
function buildWeeklyChartData(sessions: TrainingSession[]) {
  const weeks: Record<string, { week: string; swim: number; bike: number; run: number }> = {};

  for (const s of sessions) {
    const d = new Date(s.date);
    // Monday of that week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const key = format(monday, "MMM d");

    if (!weeks[key]) weeks[key] = { week: key, swim: 0, bike: 0, run: 0 };
    weeks[key][s.sport] += s.tss ?? 0;
  }

  return Object.values(weeks).slice(-8); // last 8 weeks
}
