import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // Action slots
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 dark:border-zinc-800">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
