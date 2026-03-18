"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useTasks } from "@/hooks/useTasks";
import { Task } from "@/types";
import { CheckSquare, Square, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const SCOPES: Task["scope"][] = ["daily", "weekly", "monthly", "yearly"];

const scopeColors: Record<Task["scope"], "default" | "blue" | "green" | "purple"> = {
  daily: "default",
  weekly: "blue",
  monthly: "green",
  yearly: "purple",
};

export default function TasksPage() {
  const [activeScope, setActiveScope] = useState<Task["scope"]>("daily");
  const [showForm, setShowForm] = useState(false);
  const { tasks, loading, toggleTask, createTask, deleteTask } = useTasks({
    scope: activeScope,
  });

  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          <Plus size={14} />
          Add Task
        </Button>
      </div>

      {/* Scope Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-50 rounded-lg p-1 w-fit">
        {SCOPES.map((scope) => (
          <button
            key={scope}
            onClick={() => setActiveScope(scope)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize",
              activeScope === scope
                ? "bg-surface-200 text-white"
                : "text-gray-400 hover:text-white"
            )}
          >
            {scope}
          </button>
        ))}
      </div>

      {/* Add Task Form */}
      {showForm && (
        <Card className="mb-6 animate-slide-up">
          <TaskForm
            onSubmit={async (data) => {
              await createTask(data);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
            defaultScope={activeScope}
          />
        </Card>
      )}

      {/* Task List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-surface-50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                Pending ({pending.length})
              </h3>
              <div className="space-y-1">
                {pending.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(task.id)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                Completed ({completed.length})
              </h3>
              <div className="space-y-1 opacity-60">
                {completed.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(task.id)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && (
            <div className="text-center py-16">
              <CheckSquare size={32} className="mx-auto text-gray-700 mb-3" />
              <p className="text-gray-500 text-sm">No {activeScope} tasks</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                Add your first task
              </Button>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-50 group transition-colors">
      <button onClick={onToggle} className="shrink-0 text-gray-500 hover:text-brand-400">
        {task.completed ? (
          <CheckSquare size={16} className="text-emerald-500" />
        ) : (
          <Square size={16} />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm",
            task.completed ? "line-through text-gray-600" : "text-gray-200"
          )}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-gray-600 truncate mt-0.5">{task.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {task.dueDate && (
          <span className="text-xs text-gray-600">{task.dueDate}</span>
        )}
        <Badge variant={task.priority === "critical" ? "red" : task.priority === "high" ? "yellow" : "default"}>
          {task.priority}
        </Badge>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
