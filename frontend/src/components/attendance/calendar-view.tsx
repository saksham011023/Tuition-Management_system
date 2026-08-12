"use client";

import React, { useState } from "react";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface DayMetric {
  present: number;
  absent: number;
  leave: number;
  rate: number;
}

interface CalendarViewProps {
  month: string; // YYYY-MM
  dailyStats: Record<string, DayMetric>; // Key: YYYY-MM-DD
  onChangeMonth?: (monthStr: string) => void;
}

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonthIndex(year: number, month: number) {
  // Returns index where Mon=0, Sun=6
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function getRateColor(rate: number): string {
  if (rate >= 90) return "var(--accent-success)";
  if (rate >= 75) return "var(--accent-warning)";
  return "var(--accent-danger)";
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function CalendarView({
  month: targetMonthStr,
  dailyStats,
  onChangeMonth,
}: CalendarViewProps) {
  const [yearStr, monthStr] = targetMonthStr.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  const daysCount = getDaysInMonth(year, monthIndex);
  const firstDayIndex = getFirstDayOfMonthIndex(year, monthIndex);

  const prevMonth = () => {
    if (!onChangeMonth) return;
    const prevDate = new Date(year, monthIndex - 1, 1);
    const m = String(prevDate.getMonth() + 1).padStart(2, "0");
    onChangeMonth(`${prevDate.getFullYear()}-${m}`);
  };

  const nextMonth = () => {
    if (!onChangeMonth) return;
    const nextDate = new Date(year, monthIndex + 1, 1);
    const m = String(nextDate.getMonth() + 1).padStart(2, "0");
    onChangeMonth(`${nextDate.getFullYear()}-${m}`);
  };

  // Generate date cells
  const cells = [];
  // Fill empty cells before first day
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({ day: null, dateStr: null });
  }
  // Fill month dates
  for (let d = 1; d <= daysCount; d++) {
    const dStr = String(d).padStart(2, "0");
    const mStr = String(monthIndex + 1).padStart(2, "0");
    cells.push({
      day: d,
      dateStr: `${year}-${mStr}-${dStr}`,
    });
  }

  const monthName = new Date(year, monthIndex, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="p-5 border rounded-xl space-y-4"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      {/* Calendar Header Controls */}
      <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: "var(--card-border)" }}>
        <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Attendance Calendar — {monthName}
        </h4>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-xs font-bold uppercase tracking-wider text-slate-400 py-1">
            {w}
          </span>
        ))}
      </div>

      {/* Calendar Grid Days */}
      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, idx) => {
          if (cell.day === null || cell.dateStr === null) {
            return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/20 rounded-lg" />;
          }

          const metric = dailyStats[cell.dateStr];
          const hasMetrics = !!metric;
          const markerColor = hasMetrics ? getRateColor(metric.rate) : "transparent";

          return (
            <div
              key={cell.dateStr}
              className="aspect-square rounded-lg border flex flex-col items-center justify-between p-2 relative group cursor-pointer hover:shadow-sm"
              style={{
                backgroundColor: "var(--background)",
                borderColor: hasMetrics ? markerColor : "var(--card-border)",
              }}
            >
              {/* Day Number */}
              <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                {cell.day}
              </span>

              {/* Attendance visual indicator */}
              {hasMetrics ? (
                <>
                  {/* Performance Rate Pill */}
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: markerColor }}
                  >
                    {metric.rate}%
                  </span>

                  {/* Tooltip */}
                  <div
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 p-2 rounded-lg text-[10px] text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-10 space-y-0.5 shadow-md"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.95)" }}
                  >
                    <p className="font-bold border-b pb-1 mb-1 border-white/20 text-center">
                      {cell.day} {monthName.split(" ")[0]}
                    </p>
                    <p className="flex justify-between">
                      <span>Present:</span> <b>{metric.present}</b>
                    </p>
                    <p className="flex justify-between text-red-300">
                      <span>Absent:</span> <b>{metric.absent}</b>
                    </p>
                    <p className="flex justify-between text-indigo-300">
                      <span>Leave:</span> <b>{metric.leave}</b>
                    </p>
                    <p className="flex justify-between border-t pt-1 border-white/20 font-bold">
                      <span>Rate:</span> <b>{metric.rate}%</b>
                    </p>
                  </div>
                </>
              ) : (
                <span className="text-[9px] italic text-slate-400">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
