import { z } from "zod";

// ---- Shared ------------------------------------------------

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");
const isoDateTime = z.string().datetime();
const uuid = z.string().uuid();

// ---- Task --------------------------------------------------

export const TaskScopeSchema = z.enum(["daily", "weekly", "monthly", "yearly"]);
export const PrioritySchema = z.enum(["low", "medium", "high", "critical"]);
export const RecurrenceSchema = z.enum(["none", "daily", "weekly", "monthly", "yearly"]);

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  scope: TaskScopeSchema,
  priority: PrioritySchema.default("medium"),
  completed: z.boolean().default(false),
  dueDate: isoDate.optional(),
  recurrence: RecurrenceSchema.default("none"),
  tags: z.array(z.string()).default([]),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  id: uuid,
  completedAt: isoDateTime.optional(),
});

export const TaskFilterSchema = z.object({
  scope: TaskScopeSchema.optional(),
  completed: z.boolean().optional(),
  priority: PrioritySchema.optional(),
  date: isoDate.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

// ---- Diary -------------------------------------------------

export const MoodSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
]);

export const CreateDiarySchema = z.object({
  date: isoDate,
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  mood: MoodSchema,
  tags: z.array(z.string()).default([]),
});

export const UpdateDiarySchema = CreateDiarySchema.partial().extend({ id: uuid });

export const DiaryFilterSchema = z.object({
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  mood: MoodSchema.optional(),
  limit: z.coerce.number().int().min(1).max(365).default(30),
});

// ---- Training ----------------------------------------------

export const SportSchema = z.enum(["swim", "bike", "run"]);

export const CreateTrainingSchema = z.object({
  date: isoDate,
  sport: SportSchema,
  title: z.string().min(1).max(200),
  durationMinutes: z.number().int().min(1).max(1440),
  distanceKm: z.number().min(0).max(1000).optional(),
  rpe: z.number().min(1).max(10),
  heartRateAvg: z.number().int().min(30).max(250).optional(),
  heartRateMax: z.number().int().min(30).max(250).optional(),
  notes: z.string().max(2000).optional(),
});

export const UpdateTrainingSchema = CreateTrainingSchema.partial().extend({ id: uuid });

export const TrainingFilterSchema = z.object({
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  sport: SportSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100).optional(),
});

