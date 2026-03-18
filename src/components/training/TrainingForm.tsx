"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreateTrainingSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { cn } from "@/lib/utils/cn";

type FormValues = z.infer<typeof CreateTrainingSchema>;

const fieldClass = cn(
  "w-full rounded-lg bg-surface-100 border border-surface-200",
  "px-3 py-2 text-sm text-white placeholder-gray-600",
  "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
);
const labelClass = "block text-xs text-gray-400 mb-1";

interface TrainingFormProps {
  onSubmit: (data: FormValues) => Promise<void>;
  onCancel?: () => void;
}

export function TrainingForm({ onSubmit, onCancel }: TrainingFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(CreateTrainingSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      sport: "run",
      rpe: 6,
    },
  });

  const rpe = watch("rpe");

  const submit = async (data: FormValues) => {
    await onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {/* Row: Date + Sport */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Date *</label>
          <input type="date" {...register("date")} className={cn(fieldClass, "dark:[color-scheme:dark]")} />
        </div>
        <div>
          <label className={labelClass}>Sport *</label>
          <select {...register("sport")} className={fieldClass}>
            <option value="swim">🏊 Swim</option>
            <option value="bike">🚴 Bike</option>
            <option value="run">🏃 Run</option>
          </select>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className={labelClass}>Title *</label>
        <input {...register("title")} placeholder="e.g. Morning tempo run" className={fieldClass} />
        {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>}
      </div>

      {/* Row: Duration + Distance */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Duration (min) *</label>
          <input
            type="number"
            {...register("durationMinutes", { valueAsNumber: true })}
            placeholder="60"
            className={fieldClass}
          />
          {errors.durationMinutes && (
            <p className="text-xs text-red-400 mt-1">{errors.durationMinutes.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Distance (km)</label>
          <input
            type="number"
            step="0.1"
            {...register("distanceKm", { valueAsNumber: true })}
            placeholder="10.5"
            className={fieldClass}
          />
        </div>
      </div>

      {/* RPE Slider */}
      <div>
        <label className={labelClass}>
          RPE (1-10) — <span className="text-white font-medium">{rpe}</span>
          <span className="ml-2 text-gray-600">
            {rpe <= 3 ? "Easy" : rpe <= 5 ? "Moderate" : rpe <= 7 ? "Hard" : rpe <= 9 ? "Very Hard" : "Maximal"}
          </span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          {...register("rpe", { valueAsNumber: true })}
          className="w-full accent-brand-500"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>1 (Easy)</span>
          <span>5</span>
          <span>10 (Max)</span>
        </div>
      </div>

      {/* HR (optional) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Avg HR (bpm)</label>
          <input
            type="number"
            {...register("heartRateAvg", { valueAsNumber: true })}
            placeholder="145"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Max HR (bpm)</label>
          <input
            type="number"
            {...register("heartRateMax", { valueAsNumber: true })}
            placeholder="172"
            className={fieldClass}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          {...register("notes")}
          placeholder="How did it feel? Weather, gear, observations..."
          rows={3}
          className={cn(fieldClass, "resize-none")}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        )}
        <Button type="submit" loading={isSubmitting}>Log Session</Button>
      </div>
    </form>
  );
}
