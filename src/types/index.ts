// ============================================================
// Core Domain Types — Life OS
//
// Design principles:
//   1. Every entity has a string UUID (sheets-safe, db-safe)
//   2. Dates stored as ISO-8601 strings for Sheets compatibility
//   3. Types are DB-agnostic — no Sheets-specific fields here
//   4. Zod schemas live in /lib/validation — types are derived from them
// ============================================================

// ---- Shared ------------------------------------------------

export type ISODateString = string; // "2024-03-15"
export type ISODateTimeString = string; // "2024-03-15T09:30:00Z"
export type UUID = string;

export type Priority = "low" | "medium" | "high" | "critical";
export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type Mood = 1 | 2 | 3 | 4 | 5; // 1=terrible, 5=great
export type Sport = "swim" | "bike" | "run";
export type TaskScope = "daily" | "weekly" | "monthly" | "yearly";

// ---- Task --------------------------------------------------

export interface Task {
  id: UUID;
  title: string;
  description?: string;
  scope: TaskScope;
  priority: Priority;
  completed: boolean;
  completedAt?: ISODateTimeString;
  dueDate?: ISODateString;
  recurrence: RecurrenceType;
  tags: string[];
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export type CreateTaskInput = Omit<Task, "id" | "createdAt" | "updatedAt" | "completedAt">;
export type UpdateTaskInput = Partial<Omit<Task, "id" | "createdAt">> & { id: UUID };

// ---- Diary -------------------------------------------------

export interface DiaryEntry {
  id: UUID;
  date: ISODateString;
  title: string;
  content: string; // Markdown / rich text
  mood: Mood;
  tags: string[];
  // AI-ready fields — populated by future coaching system
  aiSummary?: string;
  aiInsights?: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export type CreateDiaryInput = Omit<DiaryEntry, "id" | "createdAt" | "updatedAt" | "aiSummary" | "aiInsights">;
export type UpdateDiaryInput = Partial<Omit<DiaryEntry, "id" | "createdAt">> & { id: UUID };

// ---- Training ----------------------------------------------

export interface TrainingSession {
  id: UUID;
  date: ISODateString;
  sport: Sport;
  title: string;
  durationMinutes: number;
  distanceKm?: number;
  // Rate of Perceived Exertion: 1-10 (Borg CR10 scale)
  rpe: number;
  // Training Stress Score = duration(hrs) * rpe * rpe * 100/81
  // Stored so we can calculate CTL/ATL/TSB later (TrainingPeaks model)
  tss?: number;
  heartRateAvg?: number;
  heartRateMax?: number;
  notes?: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export type CreateTrainingInput = Omit<TrainingSession, "id" | "tss" | "createdAt" | "updatedAt">;
export type UpdateTrainingInput = Partial<Omit<TrainingSession, "id" | "createdAt">> & { id: UUID };

// Training load model (CTL/ATL/TSB — Banister model)
export interface TrainingLoad {
  date: ISODateString;
  ctl: number;  // Chronic Training Load (fitness, 42d constant)
  atl: number;  // Acute Training Load (fatigue, 7d constant)
  tsb: number;  // Training Stress Balance (form = CTL - ATL)
}

// Weekly volume summary
export interface WeeklyVolume {
  weekStart: ISODateString;
  swim: { sessions: number; durationMinutes: number; distanceKm: number };
  bike: { sessions: number; durationMinutes: number; distanceKm: number };
  run: { sessions: number; durationMinutes: number; distanceKm: number };
  totalTss: number;
}

// ---- Dashboard Aggregates ----------------------------------

export interface DashboardData {
  todayTasks: Task[];
  weeklyTrainingSummary: WeeklyVolume;
  recentDiaryEntry: DiaryEntry | null;
  trainingLoad: TrainingLoad | null;
}

// ---- API Response wrapper ----------------------------------

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  cached?: boolean;
  timestamp: ISODateTimeString;
}

export function apiSuccess<T>(data: T, cached = false): ApiResponse<T> {
  return { data, error: null, cached, timestamp: new Date().toISOString() };
}

export function apiError(error: string): ApiResponse<null> {
  return { data: null, error, cached: false, timestamp: new Date().toISOString() };
}
