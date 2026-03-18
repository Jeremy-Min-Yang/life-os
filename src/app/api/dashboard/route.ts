// GET /api/dashboard — aggregated dashboard data
// This route intentionally fetches all modules in parallel.

import { NextResponse } from "next/server";
import { format } from "date-fns";
import { getTasks } from "@/services/tasks";
import { getDiaryEntries } from "@/services/diary";
import { getWeeklyVolume, getTrainingLoad } from "@/services/training";
import { getLatestMetrics } from "@/services/metrics";
import { DashboardData, apiSuccess, apiError } from "@/types";
import { withAuth, withRateLimit } from "@/lib/utils/api";
import { withCache, cacheKeys, CACHE_TTL } from "@/lib/cache";

const GET = withRateLimit(
  withAuth(async () => {
    const today = format(new Date(), "yyyy-MM-dd");

    const { data, cached } = await withCache(
      cacheKeys.dashboard(),
      CACHE_TTL.DASHBOARD,
      async (): Promise<DashboardData> => {
        // Fetch all modules in parallel — critical for dashboard performance
        const [todayTasks, diaryEntries, weeklyTrainingSummary, latestMetrics, trainingLoad] =
          await Promise.all([
            getTasks({ scope: "daily", date: today, limit: 20 }),
            getDiaryEntries({ limit: 1 }),
            getWeeklyVolume(),
            getLatestMetrics(),
            getTrainingLoad(90),
          ]);

        return {
          todayTasks,
          weeklyTrainingSummary,
          recentDiaryEntry: diaryEntries[0] ?? null,
          latestMetrics,
          trainingLoad,
        };
      }
    );

    return NextResponse.json(apiSuccess(data, cached));
  })
);

export { GET };
