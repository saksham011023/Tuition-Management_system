"use client";

import React from "react";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface AttendanceStatsCardProps {
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  totalSessions: number;
  attendancePercentage: number;
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function AttendanceStatsCard({
  presentCount,
  absentCount,
  leaveCount,
  totalSessions,
  attendancePercentage,
}: AttendanceStatsCardProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {/* Percentage Circle Card */}
      <div
        className="p-5 border rounded-xl flex flex-col items-center justify-center text-center col-span-2 sm:col-span-1"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-100 dark:text-slate-800"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-indigo-600 dark:text-indigo-400"
              strokeWidth="3.5"
              strokeDasharray={`${attendancePercentage}, 100`}
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute font-black text-sm" style={{ color: "var(--text-primary)" }}>
            {attendancePercentage}%
          </div>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-3">
          Overall Attendance
        </span>
      </div>

      {/* KPI 2: Present */}
      <StatBox
        label="Present Sessions"
        value={presentCount}
        accentColor="var(--accent-success)"
        bgGradient="linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)"
      />

      {/* KPI 3: Absent */}
      <StatBox
        label="Absent Sessions"
        value={absentCount}
        accentColor="var(--accent-danger)"
        bgGradient="linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.02) 100%)"
      />

      {/* KPI 4: Leave */}
      <StatBox
        label="Leave Sessions"
        value={leaveCount}
        accentColor="var(--accent-purple)"
        bgGradient="linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.02) 100%)"
      />

      {/* KPI 5: Total */}
      <StatBox
        label="Total Sessions"
        value={totalSessions}
        accentColor="var(--text-primary)"
        bgGradient="linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(148, 163, 184, 0.02) 100%)"
      />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Sub-Component
   ────────────────────────────────────────────── */

interface StatBoxProps {
  label: string;
  value: number;
  accentColor: string;
  bgGradient: string;
}

function StatBox({ label, value, accentColor, bgGradient }: StatBoxProps) {
  return (
    <div
      className="p-5 border rounded-xl flex flex-col justify-between relative overflow-hidden"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: accentColor }} />
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
        {label}
      </span>
      <p className="text-3xl font-black mt-4" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
