"use client";

import React from "react";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface BatchScheduleStripProps {
  days: string[];
  timing: string;
}

/* ──────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────── */

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function BatchScheduleStrip({ days, timing }: BatchScheduleStripProps) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "var(--gradient-secondary)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5} className="w-4 h-4">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
            />
          </svg>
        </div>
        <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Weekly Schedule
        </h4>
      </div>

      {/* Day Pills */}
      <div className="flex gap-2 mb-4">
        {ALL_DAYS.map((day) => {
          const isActive = days.includes(day);
          return (
            <div
              key={day}
              className="flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all duration-300"
              style={{
                background: isActive ? "var(--gradient-primary)" : "transparent",
                color: isActive ? "#fff" : "var(--text-tertiary)",
                border: isActive ? "none" : "1px solid var(--card-border)",
                boxShadow: isActive ? "0 2px 10px rgba(99, 102, 241, 0.25)" : "none",
              }}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Timing */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{
          backgroundColor: "var(--background)",
          border: "1px solid var(--card-border)",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="w-4 h-4"
          style={{ color: "var(--accent-primary)" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {timing}
        </span>
      </div>
    </div>
  );
}
