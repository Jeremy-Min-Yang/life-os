"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CalendarEvent } from "@/services/calendarService";

interface EventModalProps {
  event: CalendarEvent | null; // null = new event
  defaultDate: Date;
  onSave: (input: {
    title: string;
    start: string;
    end: string;
    isAllDay: boolean;
    location?: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

function toDatetimeLocal(iso: string): string {
  // Convert ISO string to "YYYY-MM-DDTHH:mm" for datetime-local input
  return iso.slice(0, 16);
}

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

export function EventModal({ event, defaultDate, onSave, onDelete, onClose }: EventModalProps) {
  const isNew = !event;
  const overlayRef = useRef<HTMLDivElement>(null);

  const defaultStart = event
    ? event.isAllDay ? toDateInput(event.start) : toDatetimeLocal(event.start)
    : event === null
    ? format(defaultDate, "yyyy-MM-dd'T'HH:mm")
    : "";

  const defaultEnd = event
    ? event.isAllDay ? toDateInput(event.end) : toDatetimeLocal(event.end)
    : event === null
    ? format(defaultDate, "yyyy-MM-dd'T'HH:mm")
    : "";

  const [title, setTitle] = useState(event?.title ?? "");
  const [isAllDay, setIsAllDay] = useState(event?.isAllDay ?? false);
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [location, setLocation] = useState(event?.location ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        start,
        end: end || start,
        isAllDay,
        location: location.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-md bg-surface-50 border border-surface-200 rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">
            {isNew ? "New Event" : "Edit Event"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-surface-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <input
              autoFocus
              type="text"
              placeholder="Event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-surface-100 border border-surface-200 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* All day toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="rounded border-surface-200 bg-surface-100 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-400">All day</span>
          </label>

          {/* Start */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start</label>
            <input
              type={isAllDay ? "date" : "datetime-local"}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
              className="w-full bg-surface-100 border border-surface-200 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 [color-scheme:dark]"
            />
          </div>

          {/* End */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">End</label>
            <input
              type={isAllDay ? "date" : "datetime-local"}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full bg-surface-100 border border-surface-200 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 [color-scheme:dark]"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Location (optional)</label>
            <input
              type="text"
              placeholder="Add location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-surface-100 border border-surface-200 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            {onDelete ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                loading={deleting}
                onClick={handleDelete}
              >
                <Trash2 size={13} />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={saving}>
                {isNew ? "Create" : "Save"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
