// ============================================================
// Google Sheets Schema Definition
//
// CRITICAL: Column order determines array index mapping.
// Never reorder columns without updating the ROW_MAP below.
// Each sheet has a header row (row 1) + data rows.
//
// Sheet names match the SHEET_NAMES constants exactly.
// ============================================================

export const SHEET_NAMES = {
  TASKS: "Tasks",
  DIARY: "Diary",
  TRAINING: "Training",
  METRICS: "Metrics",
} as const;

// ---- Tasks Sheet -------------------------------------------
// A    B       C            D       E         F          G           H           I           J
// id | title | description | scope | priority | completed | completedAt | dueDate | recurrence | tags | createdAt | updatedAt
export const TASK_COLS = {
  id: 0,
  title: 1,
  description: 2,
  scope: 3,
  priority: 4,
  completed: 5,
  completedAt: 6,
  dueDate: 7,
  recurrence: 8,
  tags: 9,
  createdAt: 10,
  updatedAt: 11,
} as const;

export const TASK_HEADERS = [
  "id", "title", "description", "scope", "priority",
  "completed", "completedAt", "dueDate", "recurrence",
  "tags", "createdAt", "updatedAt",
];

// ---- Diary Sheet -------------------------------------------
// id | date | title | content | mood | tags | aiSummary | aiInsights | createdAt | updatedAt
export const DIARY_COLS = {
  id: 0,
  date: 1,
  title: 2,
  content: 3,
  mood: 4,
  tags: 5,
  aiSummary: 6,
  aiInsights: 7,
  createdAt: 8,
  updatedAt: 9,
} as const;

export const DIARY_HEADERS = [
  "id", "date", "title", "content", "mood",
  "tags", "aiSummary", "aiInsights", "createdAt", "updatedAt",
];

// ---- Training Sheet ----------------------------------------
// id | date | sport | title | durationMinutes | distanceKm | rpe | tss | heartRateAvg | heartRateMax | notes | createdAt | updatedAt
export const TRAINING_COLS = {
  id: 0,
  date: 1,
  sport: 2,
  title: 3,
  durationMinutes: 4,
  distanceKm: 5,
  rpe: 6,
  tss: 7,
  heartRateAvg: 8,
  heartRateMax: 9,
  notes: 10,
  createdAt: 11,
  updatedAt: 12,
} as const;

export const TRAINING_HEADERS = [
  "id", "date", "sport", "title", "durationMinutes",
  "distanceKm", "rpe", "tss", "heartRateAvg", "heartRateMax",
  "notes", "createdAt", "updatedAt",
];

// ---- Metrics Sheet -----------------------------------------
// id | date | weightKg | restingHr | sleepHours | fatigueScore | hrv | notes | createdAt | updatedAt
export const METRICS_COLS = {
  id: 0,
  date: 1,
  weightKg: 2,
  restingHr: 3,
  sleepHours: 4,
  fatigueScore: 5,
  hrv: 6,
  notes: 7,
  createdAt: 8,
  updatedAt: 9,
} as const;

export const METRICS_HEADERS = [
  "id", "date", "weightKg", "restingHr", "sleepHours",
  "fatigueScore", "hrv", "notes", "createdAt", "updatedAt",
];
