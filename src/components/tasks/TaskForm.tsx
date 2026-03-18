"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreateTaskSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

type FormValues = z.infer<typeof CreateTaskSchema>;

interface TaskFormProps {
  onSubmit: (data: FormValues) => Promise<void>;
  onCancel?: () => void;
  defaultScope?: FormValues["scope"];
}

const fieldClass = cn(
  "w-full rounded-lg bg-surface-100 border border-surface-200",
  "px-3 py-2 text-sm text-white placeholder-gray-600",
  "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
);

const labelClass = "block text-xs text-gray-400 mb-1";

export function TaskForm({ onSubmit, onCancel, defaultScope = "daily" }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(CreateTaskSchema),
    defaultValues: {
      scope: defaultScope,
      priority: "medium",
      recurrence: "none",
      completed: false,
      tags: [],
    },
  });

  const submit = async (data: FormValues) => {
    await onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {/* Title */}
      <div>
        <label className={labelClass}>Title *</label>
        <input
          {...register("title")}
          placeholder="What needs to be done?"
          className={fieldClass}
          autoFocus
        />
        {errors.title && (
          <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Description</label>
        <textarea
          {...register("description")}
          placeholder="Optional details..."
          rows={3}
          className={cn(fieldClass, "resize-none")}
        />
      </div>

      {/* Row: Scope + Priority + Recurrence */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Scope</label>
          <select {...register("scope")} className={fieldClass}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select {...register("priority")} className={fieldClass}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Repeat</label>
          <select {...register("recurrence")} className={fieldClass}>
            <option value="none">Once</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* Due Date */}
      <div>
        <label className={labelClass}>Due Date</label>
        <input
          type="date"
          {...register("dueDate")}
          className={cn(fieldClass, "dark:[color-scheme:dark]")}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          Add Task
        </Button>
      </div>
    </form>
  );
}
