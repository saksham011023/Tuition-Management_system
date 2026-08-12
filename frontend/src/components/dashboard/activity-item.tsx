"use client";

import React from "react";

/* ──────────────────────────────────────────────
   Icon presets for activity items
   ────────────────────────────────────────────── */

const presetIcons: Record<string, { bg: string; icon: React.ReactNode }> = {
  payment: {
    bg: "var(--gradient-success)",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4Zm12 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm13-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM1.75 14.5a.75.75 0 0 0 0 1.5c4.417 0 8.693.603 12.749 1.73 1.111.309 2.251-.512 2.251-1.696v-.784a.75.75 0 0 0-1.5 0v.784a.272.272 0 0 1-.35.25A49.043 49.043 0 0 0 1.75 14.5Z" clipRule="evenodd" />
      </svg>
    ),
  },
  reminder: {
    bg: "var(--gradient-warning)",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.91 32.91 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.903 32.903 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6ZM8.05 14.943a33.54 33.54 0 0 0 3.9 0 2 2 0 0 1-3.9 0Z" clipRule="evenodd" />
      </svg>
    ),
  },
  admission: {
    bg: "var(--gradient-primary)",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
      </svg>
    ),
  },
};

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

interface ActivityItemProps {
  /** Type determines the icon preset */
  type: "payment" | "reminder" | "admission";
  /** Primary text */
  title: string;
  /** Secondary line */
  subtitle: string;
  /** Right-side label (e.g. amount, date) */
  badge?: string;
  /** Optional badge color style */
  badgeVariant?: "success" | "warning" | "danger" | "neutral";
  /** Timestamp string */
  timestamp: string;
}

const badgeColors: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  danger: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export default function ActivityItem({
  type,
  title,
  subtitle,
  badge,
  badgeVariant = "neutral",
  timestamp,
}: ActivityItemProps) {
  const preset = presetIcons[type] || presetIcons.payment;

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-default"
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white transition-transform duration-200 group-hover:scale-110"
        style={{ background: preset.bg }}
      >
        {preset.icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </p>
        <p
          className="text-xs truncate mt-0.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          {subtitle}
        </p>
      </div>

      {/* Right side */}
      <div className="flex-shrink-0 text-right">
        {badge && (
          <span
            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColors[badgeVariant]}`}
          >
            {badge}
          </span>
        )}
        <p
          className="text-[11px] mt-0.5"
          style={{ color: "var(--text-tertiary)" }}
        >
          {timestamp}
        </p>
      </div>
    </div>
  );
}
