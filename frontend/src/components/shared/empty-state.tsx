import React from "react";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}

export function EmptyState({ title, description, action, icon: Icon = FolderOpen }: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm animate-fade-in">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-zinc-400">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
