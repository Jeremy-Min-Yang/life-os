import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  TrainingSession,
  CreateTrainingInput,
  UpdateTrainingInput,
  WeeklyVolume,
  TrainingLoad,
  Sport,
} from "@/types";
import {
  readRows, appendRow, updateRow, deleteRow, findRowIndexById, ensureHeaders,
} from "@/lib/sheets/client";
import { SHEET_NAMES, TRAINING_COLS, TRAINING_HEADERS } from "@/lib/sheets/schema";
import { cache, withCache, cacheKeys, CACHE_TTL } from "@/lib/cache";
import { CreateTrainingSchema, UpdateTrainingSchema, TrainingFilterSchema } from "@/lib/validation/schemas";
import { startOfWeek, endOfWeek, format, subDays, parseISO } from "date-fns";

// ---- TSS Calculation (Banister model) ----------------------
// TSS = (duration_sec * NP * IF) / (FTP * 3600) * 100
// For RPE-based estimate: TSS ≈ durationHrs * rpe^2 * 100/81
function calculateTSS(durationMinutes: number, rpe: number): number {
  return Math.round((durationMinutes / 60) * (rpe * rpe) * (100 / 81));
}

// ---- Row Serialization -------------------------------------

function rowToSession(row: string[]): TrainingSession {
  return {
    id: row[TRAINING_COLS.id],
    date: row[TRAINING_COLS.date],
    sport: row[TRAINING_COLS.sport] as Sport,
    title: row[TRAINING_COLS.title],
    durationMinutes: Number(row[TRAINING_COLS.durationMinutes]),
    distanceKm: row[TRAINING_COLS.distanceKm] ? Number(row[TRAINING_COLS.distanceKm]) : undefined,
    rpe: Number(row[TRAINING_COLS.rpe]),
    tss: row[TRAINING_COLS.tss] ? Number(row[TRAINING_COLS.tss]) : undefined,
    heartRateAvg: row[TRAINING_COLS.heartRateAvg] ? Number(row[TRAINING_COLS.heartRateAvg]) : undefined,
    heartRateMax: row[TRAINING_COLS.heartRateMax] ? Number(row[TRAINING_COLS.heartRateMax]) : undefined,
    notes: row[TRAINING_COLS.notes] || undefined,
    createdAt: row[TRAINING_COLS.createdAt],
    updatedAt: row[TRAINING_COLS.updatedAt],
  };
}

function sessionToRow(s: TrainingSession): (string | number)[] {
  return [
    s.id, s.date, s.sport, s.title, s.durationMinutes,
    s.distanceKm ?? "", s.rpe, s.tss ?? "",
    s.heartRateAvg ?? "", s.heartRateMax ?? "",
    s.notes ?? "", s.createdAt, s.updatedAt,
  ];
}

// ---- Service Methods ----------------------------------------

export async function getTrainingSessions(
  filters?: z.infer<typeof TrainingFilterSchema>
): Promise<TrainingSession[]> {
  await ensureHeaders(SHEET_NAMES.TRAINING, TRAINING_HEADERS);

  const cacheKey = cacheKeys.training(filters);
  const { data } = await withCache(cacheKey, CACHE_TTL.TRAINING, async () => {
    const rows = await readRows(SHEET_NAMES.TRAINING);
    return rows.filter((r) => r[TRAINING_COLS.id]).map(rowToSession);
  });

  let sessions = data;
  if (filters?.sport) sessions = sessions.filter((s) => s.sport === filters.sport);
  if (filters?.startDate) sessions = sessions.filter((s) => s.date >= filters.startDate!);
  if (filters?.endDate) sessions = sessions.filter((s) => s.date <= filters.endDate!);
  if (filters?.limit) sessions = sessions.slice(-filters.limit); // most recent N

  return sessions.sort((a, b) => b.date.localeCompare(a.date));
}

export async function createTrainingSession(
  input: CreateTrainingInput
): Promise<TrainingSession> {
  const validated = CreateTrainingSchema.parse(input);
  const now = new Date().toISOString();

  const session: TrainingSession = {
    ...validated,
    id: uuidv4(),
    tss: calculateTSS(validated.durationMinutes, validated.rpe),
    createdAt: now,
    updatedAt: now,
  };

  await appendRow(SHEET_NAMES.TRAINING, sessionToRow(session));
  cache.invalidate("training:");
  cache.invalidate("habits:");
  cache.set(cacheKeys.trainingSession(session.id), session, CACHE_TTL.TRAINING);

  return session;
}

export async function updateTrainingSession(
  input: UpdateTrainingInput
): Promise<TrainingSession> {
  const validated = UpdateTrainingSchema.parse(input);
  const existing = await getSessionById(validated.id);
  if (!existing) throw new Error(`Training session ${validated.id} not found`);

  const merged = { ...existing, ...validated, updatedAt: new Date().toISOString() };
  // Recalculate TSS if duration or rpe changed
  if (validated.durationMinutes || validated.rpe) {
    merged.tss = calculateTSS(merged.durationMinutes, merged.rpe);
  }

  const rowIndex = await findRowIndexById(SHEET_NAMES.TRAINING, merged.id);
  if (rowIndex === -1) throw new Error(`Row not found for session ${merged.id}`);

  await updateRow(SHEET_NAMES.TRAINING, rowIndex, sessionToRow(merged));
  cache.invalidate("training:");
  cache.invalidate("habits:");

  return merged;
}

export async function deleteTrainingSession(id: string): Promise<void> {
  const rowIndex = await findRowIndexById(SHEET_NAMES.TRAINING, id);
  if (rowIndex === -1) throw new Error(`Training session ${id} not found`);
  await deleteRow(SHEET_NAMES.TRAINING, rowIndex);
  cache.invalidate("training:");
  cache.invalidate("habits:");
}

async function getSessionById(id: string): Promise<TrainingSession | null> {
  const cached = cache.get<TrainingSession>(cacheKeys.trainingSession(id));
  if (cached) return cached;
  const sessions = await getTrainingSessions();
  return sessions.find((s) => s.id === id) ?? null;
}

// ---- Analytics: Weekly Volume ------------------------------

export async function getWeeklyVolume(weekOf?: Date): Promise<WeeklyVolume> {
  const ref = weekOf ?? new Date();
  const weekStart = format(startOfWeek(ref, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(ref, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const sessions = await getTrainingSessions({ startDate: weekStart, endDate: weekEnd });

  const summary = (sport: Sport) => {
    const s = sessions.filter((x) => x.sport === sport);
    return {
      sessions: s.length,
      durationMinutes: s.reduce((acc, x) => acc + x.durationMinutes, 0),
      distanceKm: s.reduce((acc, x) => acc + (x.distanceKm ?? 0), 0),
    };
  };

  return {
    weekStart,
    swim: summary("swim"),
    bike: summary("bike"),
    run: summary("run"),
    totalTss: sessions.reduce((acc, s) => acc + (s.tss ?? 0), 0),
  };
}

// ---- Analytics: Training Load (CTL/ATL/TSB) ----------------
// Banister impulse-response model
// CTL(t) = CTL(t-1) + (TSS(t) - CTL(t-1)) / 42
// ATL(t) = ATL(t-1) + (TSS(t) - ATL(t-1)) / 7
// TSB(t) = CTL(t-1) - ATL(t-1)  (yesterday's form)

export async function getTrainingLoad(daysBack = 90): Promise<TrainingLoad> {
  const endDate = new Date();
  const startDate = subDays(endDate, daysBack);

  const sessions = await getTrainingSessions({
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
  });

  // Build a date→TSS map
  const tssMap = new Map<string, number>();
  for (const s of sessions) {
    const existing = tssMap.get(s.date) ?? 0;
    tssMap.set(s.date, existing + (s.tss ?? 0));
  }

  // Walk from startDate to today
  let ctl = 0;
  let atl = 0;

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = format(current, "yyyy-MM-dd");
    const tss = tssMap.get(dateStr) ?? 0;
    ctl = ctl + (tss - ctl) / 42;
    atl = atl + (tss - atl) / 7;
    current.setDate(current.getDate() + 1);
  }

  return {
    date: format(endDate, "yyyy-MM-dd"),
    ctl: Math.round(ctl * 10) / 10,
    atl: Math.round(atl * 10) / 10,
    tsb: Math.round((ctl - atl) * 10) / 10,
  };
}
