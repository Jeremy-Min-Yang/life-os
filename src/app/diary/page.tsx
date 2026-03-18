"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CreateDiarySchema } from "@/lib/validation/schemas";
import { DiaryEntry, ApiResponse } from "@/types";
import { Plus, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type FormValues = z.infer<typeof CreateDiarySchema>;

const moodLabels = ["Terrible", "Bad", "Neutral", "Good", "Great"];

const fieldClass = cn(
  "w-full rounded-lg bg-surface-100 border border-surface-200",
  "px-3 py-2 text-sm text-white placeholder-gray-600",
  "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
);

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<DiaryEntry | null>(null);

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/api/diary?limit=30");
    const json: ApiResponse<DiaryEntry[]> = await res.json();
    setEntries(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const { register, handleSubmit, setValue, watch, formState: { isSubmitting }, reset } =
    useForm<FormValues>({
      resolver: zodResolver(CreateDiarySchema),
      defaultValues: {
        date: format(new Date(), "yyyy-MM-dd"),
        mood: 3,
        tags: [],
      },
    });

  const mood = watch("mood");

  const submit = async (data: FormValues) => {
    await fetch("/api/diary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    reset();
    setShowForm(false);
    fetchEntries();
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Journal</h2>
        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          <Plus size={14} /> New Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry list */}
        <div className="space-y-2">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-surface-50 animate-pulse" />
            ))
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={28} className="mx-auto text-gray-700 mb-3" />
              <p className="text-sm text-gray-500">No entries yet</p>
            </div>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelected(entry)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg transition-colors",
                  selected?.id === entry.id
                    ? "bg-brand-600/20 border border-brand-600/30"
                    : "bg-surface-50 border border-surface-200 hover:border-surface-200"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-brand-400">{entry.mood}</span>
                  <p className="text-sm font-medium text-white flex-1 truncate">{entry.title}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">{entry.date}</p>
              </button>
            ))
          )}
        </div>

        {/* Entry detail / write form */}
        <div className="lg:col-span-2">
          {showForm ? (
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle>New Entry</CardTitle>
              </CardHeader>
              <form onSubmit={handleSubmit(submit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Date</label>
                    <input type="date" {...register("date")} className={cn(fieldClass, "dark:[color-scheme:dark]")} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Title</label>
                    <input {...register("title")} placeholder="Today's entry title" className={fieldClass} />
                  </div>
                </div>

                {/* Mood selector */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Mood</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setValue("mood", m as FormValues["mood"])}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-sm font-semibold transition-colors",
                          mood === m ? "bg-brand-600/30 ring-1 ring-brand-500 text-brand-300" : "bg-surface-100 hover:bg-surface-200 text-gray-400"
                        )}
                        title={moodLabels[m - 1]}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Content</label>
                  <textarea
                    {...register("content")}
                    placeholder="Write your thoughts, reflections, gratitude..."
                    rows={10}
                    className={cn(fieldClass, "resize-none leading-relaxed")}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="submit" loading={isSubmitting}>Save Entry</Button>
                </div>
              </form>
            </Card>
          ) : selected ? (
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-brand-400">{selected.mood}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{selected.title}</h3>
                  <p className="text-xs text-gray-500">{selected.date} · {moodLabels[selected.mood - 1]}</p>
                </div>
              </div>
              {selected.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {selected.tags.map((tag) => (
                    <Badge key={tag} variant="default">{tag}</Badge>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{selected.content}</p>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <BookOpen size={32} className="text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm">Select an entry or write a new one</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
