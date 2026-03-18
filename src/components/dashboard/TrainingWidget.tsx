"use client";

import { WeeklyVolume, TrainingLoad } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Waves, Bike, PersonStanding } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const sportConfig = {
  swim: { label: "Swim", icon: Waves, color: "text-cyan-400", bg: "bg-cyan-900/30" },
  bike: { label: "Bike", icon: Bike, color: "text-yellow-400", bg: "bg-yellow-900/30" },
  run: { label: "Run", icon: PersonStanding, color: "text-orange-400", bg: "bg-orange-900/30" },
} as const;

interface TrainingWidgetProps {
  volume: WeeklyVolume;
  load: TrainingLoad | null;
}

export function TrainingWidget({ volume, load }: TrainingWidgetProps) {
  const tsbColor =
    !load ? "text-gray-400"
    : load.tsb > 10 ? "text-emerald-400"
    : load.tsb < -20 ? "text-red-400"
    : "text-yellow-400";

  return (
    <Card>
      <CardHeader>
        <CardTitle>This Week</CardTitle>
        {load && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Form (TSB)</p>
            <p className={cn("text-lg font-bold", tsbColor)}>
              {load.tsb > 0 ? "+" : ""}{load.tsb}
            </p>
          </div>
        )}
      </CardHeader>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {(["swim", "bike", "run"] as const).map((sport) => {
          const { label, icon: Icon, color, bg } = sportConfig[sport];
          const data = volume[sport];
          return (
            <div key={sport} className={cn("rounded-lg p-3", bg)}>
              <div className={cn("flex items-center gap-1.5 mb-2", color)}>
                <Icon size={14} />
                <span className="text-xs font-medium">{label}</span>
              </div>
              <p className="text-lg font-bold text-white">{data.sessions}</p>
              <p className="text-xs text-gray-500">sessions</p>
              {data.distanceKm > 0 && (
                <p className="text-xs text-gray-400 mt-1">{data.distanceKm.toFixed(1)} km</p>
              )}
            </div>
          );
        })}
      </div>

      {load && (
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-surface-200">
          {[
            { label: "CTL (Fitness)", value: load.ctl, color: "text-brand-400" },
            { label: "ATL (Fatigue)", value: load.atl, color: "text-red-400" },
            { label: "TSS (Week)", value: volume.totalTss, color: "text-gray-300" },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={cn("text-base font-bold", color)}>{value}</p>
              <p className="text-xs text-gray-600">{label}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
