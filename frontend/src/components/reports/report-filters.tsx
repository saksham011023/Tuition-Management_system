"use client";

import React from "react";
import type { DateRange, ReportType } from "./types";

/* ──────────────────────────────────────────────
   Props
   ────────────────────────────────────────────── */

interface ReportFiltersProps {
  reportType: ReportType;
  dateRange: DateRange;
  batchId: string;
  batches: { id: string; name: string }[];
  onDateRangeChange: (range: DateRange) => void;
  onBatchChange: (batchId: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

/* ──────────────────────────────────────────────
   Quick preset helpers
   ────────────────────────────────────────────── */

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

const PRESETS = [
  {
    label: "This Month",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    },
  },
  {
    label: "Last Month",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    },
  },
  {
    label: "Last 3 Months",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return { startDate: formatDate(start), endDate: formatDate(now) };
    },
  },
  {
    label: "This Year",
    range: () => {
      const now = new Date();
      return {
        startDate: `${now.getFullYear()}-01-01`,
        endDate: formatDate(now),
      };
    },
  },
  {
    label: "Last Year",
    range: () => {
      const y = new Date().getFullYear() - 1;
      return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
    },
  },
];

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function ReportFilters({
  reportType,
  dateRange,
  batchId,
  batches,
  onDateRangeChange,
  onBatchChange,
  onGenerate,
  loading,
}: ReportFiltersProps) {
  const showBatchFilter = reportType === "attendance";

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Report Filters
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--bg-secondary, #1e293b)", color: "var(--text-secondary)" }}>
          Custom Date Range
        </span>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const range = p.range();
          const isActive = range.startDate === dateRange.startDate && range.endDate === dateRange.endDate;
          return (
            <button
              key={p.label}
              onClick={() => onDateRangeChange(range)}
              className="text-xs px-3 py-1.5 rounded-lg border transition-all duration-150 font-medium"
              style={{
                borderColor: isActive ? "#4F46E5" : "var(--card-border)",
                backgroundColor: isActive ? "#4F46E518" : "transparent",
                color: isActive ? "#4F46E5" : "var(--text-secondary)",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Date Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            Start Date
          </label>
          <input
            type="date"
            value={dateRange.startDate}
            max={dateRange.endDate}
            onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/30"
            style={{
              borderColor: "var(--card-border)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            End Date
          </label>
          <input
            type="date"
            value={dateRange.endDate}
            min={dateRange.startDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/30"
            style={{
              borderColor: "var(--card-border)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {/* Batch filter (attendance only) */}
      {showBatchFilter && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            Filter by Batch (optional)
          </label>
          <select
            value={batchId}
            onChange={(e) => onBatchChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{
              borderColor: "var(--card-border)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-primary)",
            }}
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={loading || !dateRange.startDate || !dateRange.endDate}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
            </svg>
            Generating…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Generate Report
          </>
        )}
      </button>
    </div>
  );
}
