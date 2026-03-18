"use client";

import { useState, useEffect, useCallback } from "react";
import { Task, ApiResponse } from "@/types";

interface UseTasksOptions {
  scope?: Task["scope"];
  completed?: boolean;
  enabled?: boolean;
}

export function useTasks(options: UseTasksOptions = {}) {
  const { scope, completed, enabled = true } = options;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (scope) params.set("scope", scope);
      if (completed !== undefined) params.set("completed", String(completed));

      const res = await fetch(`/api/tasks?${params}`);
      const json: ApiResponse<Task[]> = await res.json();

      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to fetch tasks");
      setTasks(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [scope, completed, enabled]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const toggleTask = useCallback(async (id: string) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t)
    );
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ __action: "toggle" }),
      });
      if (!res.ok) throw new Error("Failed to toggle task");
      // Sync with server state
      const json: ApiResponse<Task> = await res.json();
      if (json.data) {
        setTasks((prev) => prev.map((t) => t.id === id ? json.data! : t));
      }
    } catch {
      // Rollback
      fetchTasks();
    }
  }, [fetchTasks]);

  const createTask = useCallback(
    async (input: Omit<Task, "id" | "createdAt" | "updatedAt" | "completedAt">) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json: ApiResponse<Task> = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to create task");
      await fetchTasks();
      return json.data!;
    },
    [fetchTasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) fetchTasks(); // rollback on failure
    },
    [fetchTasks]
  );

  return { tasks, loading, error, refetch: fetchTasks, toggleTask, createTask, deleteTask };
}
