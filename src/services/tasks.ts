// ============================================================
// Task Service — Domain Logic Layer
//
// ALL Sheets-specific logic is isolated here.
// Future migration: replace the implementations below with
// Postgres queries. The function signatures stay the same.
// ============================================================

import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { Task, CreateTaskInput, UpdateTaskInput } from "@/types";
import {
  readRows,
  appendRow,
  updateRow,
  deleteRow,
  findRowIndexById,
  ensureHeaders,
} from "@/lib/sheets/client";
import { SHEET_NAMES, TASK_COLS, TASK_HEADERS } from "@/lib/sheets/schema";
import {
  cache,
  withCache,
  cacheKeys,
  CACHE_TTL,
} from "@/lib/cache";
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskFilterSchema,
} from "@/lib/validation/schemas";

// ---- Row Serialization -------------------------------------

function rowToTask(row: string[]): Task {
  return {
    id: row[TASK_COLS.id],
    title: row[TASK_COLS.title],
    description: row[TASK_COLS.description] || undefined,
    scope: row[TASK_COLS.scope] as Task["scope"],
    priority: row[TASK_COLS.priority] as Task["priority"],
    completed: row[TASK_COLS.completed] === "TRUE" || row[TASK_COLS.completed] === "true",
    completedAt: row[TASK_COLS.completedAt] || undefined,
    dueDate: row[TASK_COLS.dueDate] || undefined,
    recurrence: row[TASK_COLS.recurrence] as Task["recurrence"],
    tags: row[TASK_COLS.tags] ? row[TASK_COLS.tags].split(",").map((t) => t.trim()) : [],
    createdAt: row[TASK_COLS.createdAt],
    updatedAt: row[TASK_COLS.updatedAt],
  };
}

function taskToRow(task: Task): (string | boolean)[] {
  return [
    task.id,
    task.title,
    task.description ?? "",
    task.scope,
    task.priority,
    task.completed,
    task.completedAt ?? "",
    task.dueDate ?? "",
    task.recurrence,
    task.tags.join(","),
    task.createdAt,
    task.updatedAt,
  ];
}

// ---- Service Methods ----------------------------------------

export async function getTasks(
  filters?: z.infer<typeof TaskFilterSchema>
): Promise<Task[]> {
  await ensureHeaders(SHEET_NAMES.TASKS, TASK_HEADERS);

  const cacheKey = cacheKeys.tasks(filters);
  const { data } = await withCache(cacheKey, CACHE_TTL.TASKS, async () => {
    const rows = await readRows(SHEET_NAMES.TASKS);
    return rows
      .filter((row) => row[TASK_COLS.id]) // skip empty rows
      .map(rowToTask);
  });

  let tasks = data;

  // Apply filters in-memory (Sheets has no query layer)
  if (filters?.scope) tasks = tasks.filter((t) => t.scope === filters.scope);
  if (filters?.completed !== undefined)
    tasks = tasks.filter((t) => t.completed === filters.completed);
  if (filters?.priority) tasks = tasks.filter((t) => t.priority === filters.priority);
  if (filters?.date)
    tasks = tasks.filter(
      (t) => !t.dueDate || t.dueDate === filters.date
    );
  if (filters?.limit) tasks = tasks.slice(0, filters.limit);

  return tasks;
}

export async function getTaskById(id: string): Promise<Task | null> {
  const cacheKey = cacheKeys.task(id);
  const cached = cache.get<Task>(cacheKey);
  if (cached) return cached;

  const tasks = await getTasks();
  const task = tasks.find((t) => t.id === id) ?? null;
  if (task) cache.set(cacheKey, task, CACHE_TTL.TASKS);
  return task;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const validated = CreateTaskSchema.parse(input);
  const now = new Date().toISOString();

  const task: Task = {
    ...validated,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };

  await appendRow(SHEET_NAMES.TASKS, taskToRow(task));

  // Invalidate list caches and dashboard; keep item cache warm
  cache.invalidate("tasks:list:");
  cache.invalidate("dashboard:");
  cache.set(cacheKeys.task(task.id), task, CACHE_TTL.TASKS);

  return task;
}

export async function updateTask(input: UpdateTaskInput): Promise<Task> {
  const validated = UpdateTaskSchema.parse(input);
  const { id } = validated;

  const existing = await getTaskById(id);
  if (!existing) throw new Error(`Task ${id} not found`);

  const updated: Task = {
    ...existing,
    ...validated,
    updatedAt: new Date().toISOString(),
  };

  const rowIndex = await findRowIndexById(SHEET_NAMES.TASKS, id);
  if (rowIndex === -1) throw new Error(`Row not found for task ${id}`);

  await updateRow(SHEET_NAMES.TASKS, rowIndex, taskToRow(updated));

  // Invalidate all caches for this item and dashboard
  cache.invalidate("tasks:");
  cache.invalidate("dashboard:");
  cache.set(cacheKeys.task(id), updated, CACHE_TTL.TASKS);

  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  const rowIndex = await findRowIndexById(SHEET_NAMES.TASKS, id);
  if (rowIndex === -1) throw new Error(`Task ${id} not found`);

  await deleteRow(SHEET_NAMES.TASKS, rowIndex);
  cache.invalidate("tasks:");
  cache.invalidate("dashboard:");
}

export async function toggleTaskCompletion(id: string): Promise<Task> {
  const task = await getTaskById(id);
  if (!task) throw new Error(`Task ${id} not found`);

  return updateTask({
    id,
    completed: !task.completed,
    completedAt: !task.completed ? new Date().toISOString() : undefined,
  });
}
