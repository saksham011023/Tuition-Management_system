"use client";

import React from "react";
import type { ReportType, DateRange, ExportFormat } from "./types";

/* ──────────────────────────────────────────────
   Report definitions
   ────────────────────────────────────────────── */

export interface ReportDefinition {
  id: ReportType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

const REPORT_DEFS: ReportDefinition[] = [
  {
    id: "fee_collection",
    label: "Fee Collection",
    description: "Collected vs expected fees with mode breakdown",
    gradient: "linear-gradient(135deg, #4F46E5, #7C3AED)",
    color: "#4F46E5",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    ),
  },
  {
    id: "pending_fees",
    label: "Pending Fees",
    description: "Outstanding balances and overdue records",
    gradient: "linear-gradient(135deg, #EF4444, #DC2626)",
    color: "#EF4444",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    ),
  },
  {
    id: "attendance",
    label: "Attendance",
    description: "Student and daily attendance rates by batch",
    gradient: "linear-gradient(135deg, #10B981, #059669)",
    color: "#10B981",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    id: "student_performance",
    label: "Student Performance",
    description: "Test scores, attendance % and fee standing",
    gradient: "linear-gradient(135deg, #F59E0B, #D97706)",
    color: "#F59E0B",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-1.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    id: "batch",
    label: "Batch Report",
    description: "Batch-wise attendance, capacity and fee data",
    gradient: "linear-gradient(135deg, #06B6D4, #0891B2)",
    color: "#06B6D4",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
  },
  {
    id: "monthly_summary",
    label: "Monthly Summary",
    description: "Month-by-month overview of all key metrics",
    gradient: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
    color: "#8B5CF6",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
];

/* ──────────────────────────────────────────────
   Props & Component
   ────────────────────────────────────────────── */

interface ReportSelectorProps {
  selected: ReportType;
  onChange: (type: ReportType) => void;
}

export default function ReportSelector({ selected, onChange }: ReportSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {REPORT_DEFS.map((def) => {
        const isActive = def.id === selected;
        return (
          <button
            key={def.id}
            onClick={() => onChange(def.id)}
            className="group relative flex flex-col gap-2 p-4 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02]"
            style={{
              borderColor: isActive ? def.color : "var(--card-border)",
              backgroundColor: isActive ? `${def.color}18` : "var(--card-bg)",
              boxShadow: isActive ? `0 0 0 2px ${def.color}40` : undefined,
            }}
          >
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
              style={{ background: isActive ? def.gradient : "var(--bg-secondary, #1e293b)" }}
            >
              {def.icon}
            </div>

            {/* Text */}
            <div className="min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: isActive ? def.color : "var(--text-primary)" }}
              >
                {def.label}
              </p>
              <p
                className="text-xs leading-snug mt-0.5 line-clamp-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {def.description}
              </p>
            </div>

            {/* Active indicator dot */}
            {isActive && (
              <span
                className="absolute top-3 right-3 w-2 h-2 rounded-full"
                style={{ backgroundColor: def.color }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export { REPORT_DEFS };
