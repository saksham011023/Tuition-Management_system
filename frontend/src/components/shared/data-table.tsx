"use client";

import React from "react";
import { Pagination } from "./pagination";
import { EmptyState } from "./empty-state";
import { LoadingSpinner } from "./loading-spinner";

interface Column<T> {
  header: string;
  accessor?: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "There are no records matching your query.",
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
        <LoadingSpinner size="md" className="mb-2" />
        <span className="text-xs text-slate-500 dark:text-zinc-400">
          Loading datasets...
        </span>
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-zinc-800">
          <thead className="bg-slate-50/75 dark:bg-zinc-950/20">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 ${
                    col.className || ""
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
            {data.map((item, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick?.(item)}
                className={`transition-colors ${
                  onRowClick
                    ? "cursor-pointer hover:bg-slate-50/50 dark:hover:bg-zinc-800/20"
                    : ""
                }`}
              >
                {columns.map((col, colIdx) => {
                  let content: React.ReactNode = "";
                  if (col.accessor) {
                    if (typeof col.accessor === "function") {
                      content = col.accessor(item);
                    } else {
                      content = (item[col.accessor] as any)?.toString() || "";
                    }
                  }
                  return (
                    <td
                      key={colIdx}
                      className={`whitespace-nowrap px-6 py-4 text-sm text-slate-700 dark:text-zinc-300 ${
                        col.className || ""
                      }`}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {onPageChange && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
