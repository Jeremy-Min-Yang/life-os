"use client";

import { Task } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CheckSquare, Square, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

const priorityColors: Record<Task["priority"], "default" | "blue" | "yellow" | "red"> = {
  low: "default",
  medium: "blue",
  high: "yellow",
  critical: "red",
};

interface TasksWidgetProps {
  tasks: Task[];
  onToggle: (id: string) => void;
}

export function TasksWidget({ tasks, onToggle }: TasksWidgetProps) {
  const pending = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Tasks</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {done.length}/{tasks.length} done
          </span>
          <Link
            href="/tasks"
            className="p-1 rounded hover:bg-surface-100 text-gray-500 hover:text-white transition-colors"
          >
            <Plus size={14} />
          </Link>
        </div>
      </CardHeader>

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-600 py-4 text-center">No tasks today. Add one!</p>
      ) : (
        <ul className="space-y-1">
          {[...pending, ...done].map((task) => (
            <li
              key={task.id}
              className={cn(
                "flex items-start gap-3 py-2 px-1 rounded-lg group transition-colors",
                "hover:bg-surface-100 cursor-pointer"
              )}
              onClick={() => onToggle(task.id)}
            >
              <button className="mt-0.5 shrink-0 text-gray-500 group-hover:text-brand-400 transition-colors">
                {task.completed ? (
                  <CheckSquare size={16} className="text-emerald-500" />
                ) : (
                  <Square size={16} />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm leading-snug",
                    task.completed ? "line-through text-gray-600" : "text-gray-200"
                  )}
                >
                  {task.title}
                </p>
              </div>
              <Badge variant={priorityColors[task.priority]} className="shrink-0">
                {task.priority}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
