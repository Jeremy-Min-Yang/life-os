"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardData, ApiResponse } from "@/types";

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await window.fetch("/api/dashboard");
      const json: ApiResponse<DashboardData> = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to fetch dashboard");
      setData(json.data);
      setFromCache(json.cached ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, fromCache, refetch: fetch };
}
