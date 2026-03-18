"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CreateMetricsSchema } from "@/lib/validation/schemas";
import { DailyMetrics, ApiResponse } from "@/types";
import { Plus } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/utils/cn";

type FormValues = z.infer<typeof CreateMetricsSchema>;

const fieldClass = cn(
  "w-full rounded-lg bg-surface-100 border border-surface-200",
  "px-3 py-2 text-sm text-white placeholder-gray-600",
  "focus:outline-none focus:ring-2 focus:ring-brand-500"
);
const labelClass = "block text-xs text-gray-400 mb-1";

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<DailyMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchMetrics = useCallback(async () => {
    const res = await fetch("/api/metrics?limit=90");
    const json: ApiResponse<DailyMetrics[]> = await res.json();
    setMetrics((json.data ?? []).slice().reverse()); // chronological for charts
    setLoading(false);
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const { register, handleSubmit, formState: { isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(CreateMetricsSchema),
    defaultValues: { date: format(new Date(), "yyyy-MM-dd") },
  });

  const submit = async (data: FormValues) => {
    await fetch("/api/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    reset({ date: format(new Date(), "yyyy-MM-dd") });
    setShowForm(false);
    fetchMetrics();
  };

  // Chart: last 30 data points
  const chartData = metrics.slice(-30).map((m) => ({
    date: m.date.slice(5), // MM-DD
    weight: m.weightKg,
    hr: m.restingHr,
    sleep: m.sleepHours,
    fatigue: m.fatigueScore,
  }));

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Metrics</h2>
        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          <Plus size={14} /> Log Today
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 animate-slide-up">
          <CardHeader><CardTitle>Log Metrics</CardTitle></CardHeader>
          <form onSubmit={handleSubmit(submit)} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Date</label>
                <input type="date" {...register("date")} className={cn(fieldClass, "dark:[color-scheme:dark]")} />
              </div>
              <div>
                <label className={labelClass}>Weight (kg)</label>
                <input type="number" step="0.1" {...register("weightKg", { valueAsNumber: true })} placeholder="70.5" className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Resting HR (bpm)</label>
                <input type="number" {...register("restingHr", { valueAsNumber: true })} placeholder="52" className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Sleep (hours)</label>
                <input type="number" step="0.5" {...register("sleepHours", { valueAsNumber: true })} placeholder="7.5" className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Fatigue (1-10)</label>
                <input type="number" min="1" max="10" {...register("fatigueScore", { valueAsNumber: true })} placeholder="3" className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>HRV (ms)</label>
                <input type="number" {...register("hrv", { valueAsNumber: true })} placeholder="65" className={fieldClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <input {...register("notes")} placeholder="Any notes for today" className={fieldClass} />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Save</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Charts */}
      {!loading && chartData.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader><CardTitle>Weight (kg)</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3244" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ backgroundColor: "#1a1d27", border: "1px solid #2e3244", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="weight" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sleep & Fatigue</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3244" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: "#1a1d27", border: "1px solid #2e3244", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="sleep" stroke="#818cf8" strokeWidth={2} dot={false} name="Sleep (h)" />
                <Line type="monotone" dataKey="fatigue" stroke="#f87171" strokeWidth={2} dot={false} name="Fatigue" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-surface-200">
                {["Date", "Weight", "Resting HR", "Sleep", "Fatigue", "HRV"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...metrics].reverse().map((m) => (
                <tr key={m.id} className="border-b border-surface-200/50 hover:bg-surface-100/30">
                  <td className="py-2 px-3 text-gray-400">{m.date}</td>
                  <td className="py-2 px-3">{m.weightKg ?? "—"}</td>
                  <td className="py-2 px-3">{m.restingHr ?? "—"}</td>
                  <td className="py-2 px-3">{m.sleepHours ?? "—"}</td>
                  <td className="py-2 px-3">{m.fatigueScore ?? "—"}</td>
                  <td className="py-2 px-3">{m.hrv ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
