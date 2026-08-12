"use client";

import React from "react";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface TrendItem {
  label: string;
  present_count: number;
  absent_count: number;
  leave_count: number;
  attendance_rate: number;
}

interface AttendanceTrendsChartProps {
  trends: TrendItem[];
}

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function getRateColor(rate: number): string {
  if (rate >= 90) return "var(--accent-success)";
  if (rate >= 75) return "var(--accent-warning)";
  return "var(--accent-danger)";
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function AttendanceTrendsChart({ trends }: AttendanceTrendsChartProps) {
  if (trends.length === 0) {
    return (
      <div className="p-8 text-center border rounded-xl" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>
          No trend records found for the range.
        </p>
      </div>
    );
  }

  const maxVal = 100;

  return (
    <div
      className="p-5 border rounded-xl space-y-6"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
        Attendance Performance Chart
      </h4>

      {/* Chart Canvas Area */}
      <div className="h-64 flex items-end justify-between gap-2 px-2 pt-6 border-b" style={{ borderColor: "var(--card-border)" }}>
        {trends.map((item, idx) => {
          const heightPct = (item.attendance_rate / maxVal) * 100;
          const barColor = getRateColor(item.attendance_rate);

          return (
            <div key={`${item.label}-${idx}`} className="flex-1 flex flex-col items-center group relative h-full justify-end">
              {/* Tooltip */}
              <div
                className="absolute bottom-full mb-2 p-2 rounded-lg text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 w-28 text-center shadow-md"
                style={{ backgroundColor: "rgba(15, 23, 42, 0.95)" }}
              >
                <p className="font-bold border-b pb-1 mb-1 border-white/20">{item.label}</p>
                <p className="text-[11px] font-extrabold" style={{ color: barColor }}>Rate: {item.attendance_rate}%</p>
                <p className="text-[9px] text-slate-300 mt-1">Present: {item.present_count}</p>
                <p className="text-[9px] text-red-300">Absent: {item.absent_count}</p>
                <p className="text-[9px] text-indigo-300">Leave: {item.leave_count}</p>
              </div>

              {/* Performance Rate Bar */}
              <div
                className="w-full rounded-t-md transition-all duration-700 ease-out min-h-[4px]"
                style={{
                  height: `${Math.max(heightPct, 4)}%`,
                  backgroundColor: barColor,
                  opacity: 0.85,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X Axis Labels */}
      <div className="flex justify-between gap-2 text-center text-[10px] font-bold text-slate-400">
        {trends.map((item, idx) => (
          <span key={`lbl-${item.label}-${idx}`} className="flex-1 truncate px-0.5">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
