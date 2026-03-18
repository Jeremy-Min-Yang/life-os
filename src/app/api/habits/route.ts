// GET /api/habits — returns dates with physical activity and journal entries for the past year

import { NextResponse } from "next/server";
import { format, subDays } from "date-fns";
import { getTrainingSessions } from "@/services/training";
import { getDiaryEntries } from "@/services/diary";
import { apiSuccess } from "@/types";
import { withAuth, withRateLimit } from "@/lib/utils/api";
import { withCache, CACHE_TTL } from "@/lib/cache";

const GET = withRateLimit(
  withAuth(async () => {
    const startDate = format(subDays(new Date(), 365), "yyyy-MM-dd");

    const { data, cached } = await withCache(
      "habits:year",
      CACHE_TTL.TRAINING,
      async () => {
        const [sessions, entries] = await Promise.all([
          getTrainingSessions({ startDate, limit: 500 }),
          getDiaryEntries({ limit: 400 }),
        ]);

        const trainingDates = Array.from(new Set(sessions.map((s) => s.date)));
        const journalDates = entries
          .filter((e) => e.date >= startDate)
          .map((e) => e.date);

        return { trainingDates, journalDates };
      }
    );

    return NextResponse.json(apiSuccess(data, cached));
  })
);

export { GET };
