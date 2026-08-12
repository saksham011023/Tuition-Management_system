"use client";

import React from "react";

/* ──────────────────────────────────────────────
   Icon map — lightweight inline SVGs
   ────────────────────────────────────────────── */

const icons: Record<string, React.ReactNode> = {
  students: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
  batches: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  ),
  collection: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 8.25H9m6 3H9m3 6-3-3h1.5a3 3 0 1 0 0-6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  pending: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  due_fees: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  attendance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  tests: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
};

/* ──────────────────────────────────────────────
   Gradient map per card icon
   ────────────────────────────────────────────── */

const gradients: Record<string, string> = {
  students: "var(--gradient-primary)",
  batches: "var(--gradient-secondary)",
  collection: "var(--gradient-success)",
  pending: "var(--gradient-warning)",
  due_fees: "var(--gradient-danger)",
  attendance: "var(--gradient-purple)",
  tests: "var(--gradient-pink)",
};

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

interface StatCardProps {
  label: string;
  value: string;
  change?: number | null;
  changeLabel?: string | null;
  icon: string;
}

export default function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
}: StatCardProps) {
  const isPositive = change != null && change >= 0;
  const isNegative = change != null && change < 0;

  return (
    <div
      className="group relative overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-0.5 cursor-default"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--card-shadow-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--card-shadow)";
      }}
    >
      <div className="p-5 flex items-start justify-between gap-4">
        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {label}
          </p>
          <p
            className="mt-2 text-2xl font-bold tracking-tight animate-count-up"
            style={{ color: "var(--text-primary)" }}
          >
            {value}
          </p>

          {change != null && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
              {/* Arrow icon */}
              <span
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${
                  isPositive
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                    : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                }`}
              >
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className={`w-3 h-3 ${isNegative ? "rotate-180" : ""}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V3m0 0L3 6m3-3 3 3" />
                </svg>
                {Math.abs(change).toFixed(1)}%
              </span>
              {changeLabel && (
                <span style={{ color: "var(--text-tertiary)" }}>
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110"
          style={{ background: gradients[icon] || "var(--gradient-primary)" }}
        >
          {icons[icon] || icons.students}
        </div>
      </div>

      {/* Decorative bottom gradient bar */}
      <div
        className="h-1 w-full opacity-80"
        style={{ background: gradients[icon] || "var(--gradient-primary)" }}
      />
    </div>
  );
}
