"use client";

import { DailyMetrics } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Weight, Heart, Moon, Zap } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}

function MetricItem({ icon, label, value, color = "text-white" }: MetricItemProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className={cn("text-sm font-semibold", color)}>{value}</span>
    </div>
  );
}

interface MetricsWidgetProps {
  metrics: DailyMetrics | null;
}

export function MetricsWidget({ metrics }: MetricsWidgetProps) {
  const fatigueColor =
    !metrics?.fatigueScore ? "text-gray-500"
    : metrics.fatigueScore <= 3 ? "text-emerald-400"
    : metrics.fatigueScore <= 6 ? "text-yellow-400"
    : "text-red-400";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Metrics</CardTitle>
        {metrics && (
          <span className="text-xs text-gray-600">{metrics.date}</span>
        )}
      </CardHeader>

      {!metrics ? (
        <p className="text-sm text-gray-600 py-4 text-center">No metrics logged yet</p>
      ) : (
        <div className="divide-y divide-surface-200">
          {metrics.weightKg && (
            <MetricItem
              icon={<Weight size={14} />}
              label="Weight"
              value={`${metrics.weightKg} kg`}
            />
          )}
          {metrics.restingHr && (
            <MetricItem
              icon={<Heart size={14} />}
              label="Resting HR"
              value={`${metrics.restingHr} bpm`}
              color={metrics.restingHr > 60 ? "text-yellow-400" : "text-emerald-400"}
            />
          )}
          {metrics.sleepHours && (
            <MetricItem
              icon={<Moon size={14} />}
              label="Sleep"
              value={`${metrics.sleepHours}h`}
              color={metrics.sleepHours >= 7 ? "text-emerald-400" : "text-yellow-400"}
            />
          )}
          {metrics.fatigueScore && (
            <MetricItem
              icon={<Zap size={14} />}
              label="Fatigue"
              value={`${metrics.fatigueScore}/10`}
              color={fatigueColor}
            />
          )}
        </div>
      )}
    </Card>
  );
}
