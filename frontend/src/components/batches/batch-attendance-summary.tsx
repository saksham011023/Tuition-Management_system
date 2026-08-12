"use client";

import React from "react";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface AttendanceSummary {
  total_sessions: number;
  total_present: number;
  total_absent: number;
  avg_present_rate: number;
  avg_absent_rate: number;
}

interface BatchAttendanceSummaryProps {
  summary: AttendanceSummary;
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function BatchAttendanceSummary({ summary }: BatchAttendanceSummaryProps) {
  const { total_sessions, total_present, total_absent, avg_present_rate, avg_absent_rate } = summary;

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
          style={{ background: "var(--gradient-success)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5} className="w-4 h-4">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>
        <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Attendance Summary
        </h4>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center">
          <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            {total_sessions}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Total Sessions
          </p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold" style={{ color: "var(--accent-success)" }}>
            {total_present}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Present
          </p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold" style={{ color: "var(--accent-danger)" }}>
            {total_absent}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Absent
          </p>
        </div>
      </div>

      {/* Present Bar */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Present Rate
            </span>
            <span className="text-xs font-bold" style={{ color: "var(--accent-success)" }}>
              {avg_present_rate}%
            </span>
          </div>
          <div
            className="w-full h-2.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--background)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${avg_present_rate}%`,
                background: "var(--gradient-success)",
              }}
            />
          </div>
        </div>

        {/* Absent Bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Absent Rate
            </span>
            <span className="text-xs font-bold" style={{ color: "var(--accent-danger)" }}>
              {avg_absent_rate}%
            </span>
          </div>
          <div
            className="w-full h-2.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--background)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${avg_absent_rate}%`,
                background: "var(--gradient-danger)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
