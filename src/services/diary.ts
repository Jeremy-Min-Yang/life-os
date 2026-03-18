import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { DiaryEntry, CreateDiaryInput, UpdateDiaryInput } from "@/types";
import {
  readRows, appendRow, updateRow, deleteRow, findRowIndexById, ensureHeaders,
} from "@/lib/sheets/client";
import { SHEET_NAMES, DIARY_COLS, DIARY_HEADERS } from "@/lib/sheets/schema";
import { cache, withCache, cacheKeys, CACHE_TTL } from "@/lib/cache";
import { CreateDiarySchema, UpdateDiarySchema, DiaryFilterSchema } from "@/lib/validation/schemas";

// ---- Row Serialization -------------------------------------

function rowToEntry(row: string[]): DiaryEntry {
  return {
    id: row[DIARY_COLS.id],
    date: row[DIARY_COLS.date],
    title: row[DIARY_COLS.title],
    content: row[DIARY_COLS.content],
    mood: Number(row[DIARY_COLS.mood]) as DiaryEntry["mood"],
    tags: row[DIARY_COLS.tags] ? row[DIARY_COLS.tags].split(",").map((t) => t.trim()) : [],
    aiSummary: row[DIARY_COLS.aiSummary] || undefined,
    aiInsights: row[DIARY_COLS.aiInsights] || undefined,
    createdAt: row[DIARY_COLS.createdAt],
    updatedAt: row[DIARY_COLS.updatedAt],
  };
}

function entryToRow(e: DiaryEntry): string[] {
  return [
    e.id, e.date, e.title, e.content, String(e.mood),
    e.tags.join(","), e.aiSummary ?? "", e.aiInsights ?? "",
    e.createdAt, e.updatedAt,
  ];
}

// ---- Service Methods ----------------------------------------

export async function getDiaryEntries(
  filters?: z.infer<typeof DiaryFilterSchema>
): Promise<DiaryEntry[]> {
  await ensureHeaders(SHEET_NAMES.DIARY, DIARY_HEADERS);

  const cacheKey = cacheKeys.diary(filters);
  const { data } = await withCache(cacheKey, CACHE_TTL.DIARY, async () => {
    const rows = await readRows(SHEET_NAMES.DIARY);
    return rows.filter((r) => r[DIARY_COLS.id]).map(rowToEntry);
  });

  let entries = data;
  if (filters?.mood) entries = entries.filter((e) => e.mood === filters.mood);
  if (filters?.startDate) entries = entries.filter((e) => e.date >= filters.startDate!);
  if (filters?.endDate) entries = entries.filter((e) => e.date <= filters.endDate!);
  if (filters?.limit) entries = entries.slice(-filters.limit);

  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getDiaryEntryByDate(date: string): Promise<DiaryEntry | null> {
  const entries = await getDiaryEntries();
  return entries.find((e) => e.date === date) ?? null;
}

export async function createDiaryEntry(input: CreateDiaryInput): Promise<DiaryEntry> {
  const validated = CreateDiarySchema.parse(input);

  // One entry per day
  const existing = await getDiaryEntryByDate(validated.date);
  if (existing) throw new Error(`Diary entry for ${validated.date} already exists`);

  const now = new Date().toISOString();
  const entry: DiaryEntry = { ...validated, id: uuidv4(), createdAt: now, updatedAt: now };

  await appendRow(SHEET_NAMES.DIARY, entryToRow(entry));
  cache.invalidate("diary:");

  return entry;
}

export async function updateDiaryEntry(input: UpdateDiaryInput): Promise<DiaryEntry> {
  const validated = UpdateDiarySchema.parse(input);
  const entries = await getDiaryEntries();
  const existing = entries.find((e) => e.id === validated.id);
  if (!existing) throw new Error(`Diary entry ${validated.id} not found`);

  const updated: DiaryEntry = { ...existing, ...validated, updatedAt: new Date().toISOString() };

  const rowIndex = await findRowIndexById(SHEET_NAMES.DIARY, validated.id);
  if (rowIndex === -1) throw new Error(`Row not found for entry ${validated.id}`);

  await updateRow(SHEET_NAMES.DIARY, rowIndex, entryToRow(updated));
  cache.invalidate("diary:");

  return updated;
}

export async function deleteDiaryEntry(id: string): Promise<void> {
  const rowIndex = await findRowIndexById(SHEET_NAMES.DIARY, id);
  if (rowIndex === -1) throw new Error(`Diary entry ${id} not found`);
  await deleteRow(SHEET_NAMES.DIARY, rowIndex);
  cache.invalidate("diary:");
}
