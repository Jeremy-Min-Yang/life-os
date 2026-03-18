import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { DailyMetrics, CreateMetricsInput, UpdateMetricsInput } from "@/types";
import {
  readRows, appendRow, updateRow, deleteRow, findRowIndexById, ensureHeaders,
} from "@/lib/sheets/client";
import { SHEET_NAMES, METRICS_COLS, METRICS_HEADERS } from "@/lib/sheets/schema";
import { cache, withCache, cacheKeys, CACHE_TTL } from "@/lib/cache";
import { CreateMetricsSchema, UpdateMetricsSchema, MetricsFilterSchema } from "@/lib/validation/schemas";

function rowToMetrics(row: string[]): DailyMetrics {
  return {
    id: row[METRICS_COLS.id],
    date: row[METRICS_COLS.date],
    weightKg: row[METRICS_COLS.weightKg] ? Number(row[METRICS_COLS.weightKg]) : undefined,
    restingHr: row[METRICS_COLS.restingHr] ? Number(row[METRICS_COLS.restingHr]) : undefined,
    sleepHours: row[METRICS_COLS.sleepHours] ? Number(row[METRICS_COLS.sleepHours]) : undefined,
    fatigueScore: row[METRICS_COLS.fatigueScore] ? Number(row[METRICS_COLS.fatigueScore]) : undefined,
    hrv: row[METRICS_COLS.hrv] ? Number(row[METRICS_COLS.hrv]) : undefined,
    notes: row[METRICS_COLS.notes] || undefined,
    createdAt: row[METRICS_COLS.createdAt],
    updatedAt: row[METRICS_COLS.updatedAt],
  };
}

function metricsToRow(m: DailyMetrics): (string | number)[] {
  return [
    m.id, m.date, m.weightKg ?? "", m.restingHr ?? "",
    m.sleepHours ?? "", m.fatigueScore ?? "", m.hrv ?? "",
    m.notes ?? "", m.createdAt, m.updatedAt,
  ];
}

export async function getMetrics(
  filters?: z.infer<typeof MetricsFilterSchema>
): Promise<DailyMetrics[]> {
  await ensureHeaders(SHEET_NAMES.METRICS, METRICS_HEADERS);

  const cacheKey = cacheKeys.metrics(filters);
  const { data } = await withCache(cacheKey, CACHE_TTL.METRICS, async () => {
    const rows = await readRows(SHEET_NAMES.METRICS);
    return rows.filter((r) => r[METRICS_COLS.id]).map(rowToMetrics);
  });

  let metrics = data;
  if (filters?.startDate) metrics = metrics.filter((m) => m.date >= filters.startDate!);
  if (filters?.endDate) metrics = metrics.filter((m) => m.date <= filters.endDate!);
  if (filters?.limit) metrics = metrics.slice(-filters.limit);

  return metrics.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getLatestMetrics(): Promise<DailyMetrics | null> {
  const all = await getMetrics({ limit: 1 });
  return all[0] ?? null;
}

export async function createMetrics(input: CreateMetricsInput): Promise<DailyMetrics> {
  const validated = CreateMetricsSchema.parse(input);
  const now = new Date().toISOString();
  const metrics: DailyMetrics = { ...validated, id: uuidv4(), createdAt: now, updatedAt: now };

  await appendRow(SHEET_NAMES.METRICS, metricsToRow(metrics));
  cache.invalidate("metrics:");

  return metrics;
}

export async function updateMetrics(input: UpdateMetricsInput): Promise<DailyMetrics> {
  const validated = UpdateMetricsSchema.parse(input);
  const all = await getMetrics();
  const existing = all.find((m) => m.id === validated.id);
  if (!existing) throw new Error(`Metrics entry ${validated.id} not found`);

  const updated: DailyMetrics = { ...existing, ...validated, updatedAt: new Date().toISOString() };

  const rowIndex = await findRowIndexById(SHEET_NAMES.METRICS, validated.id);
  await updateRow(SHEET_NAMES.METRICS, rowIndex, metricsToRow(updated));
  cache.invalidate("metrics:");

  return updated;
}

export async function upsertMetrics(input: CreateMetricsInput): Promise<DailyMetrics> {
  const all = await getMetrics();
  const existing = all.find((m) => m.date === input.date);
  if (existing) return updateMetrics({ ...input, id: existing.id });
  return createMetrics(input);
}
