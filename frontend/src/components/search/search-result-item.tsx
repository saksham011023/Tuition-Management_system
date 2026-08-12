"use client";

import React from "react";
import type { SearchResult } from "./types";

interface SearchResultItemProps {
  result: SearchResult;
  active: boolean;
  onSelect: () => void;
}

export default function SearchResultItem({ result, active, onSelect }: SearchResultItemProps) {
  // Category configuration
  const categoryConfig: Record<
    string,
    { label: string; bg: string; text: string; icon: React.ReactNode }
  > = {
    students: {
      label: "Student",
      bg: "rgba(79, 70, 229, 0.1)",
      text: "#4F46E5",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
    batches: {
      label: "Batch",
      bg: "rgba(6, 182, 212, 0.1)",
      text: "#06B6D4",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      ),
    },
    fees: {
      label: "Fee Record",
      bg: "rgba(245, 158, 11, 0.1)",
      text: "#D97706",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-.621-.504-1.125-1.125-1.125H9.75M3 16.25V7.5A2.25 2.25 0 015.25 5.25h13.5A2.25 2.25 0 0121 7.5v8.75m-18 0A2.25 2.25 0 005.25 18.75h13.5A2.25 2.25 0 0021 16.25m-18 0V12m18 4.25V12m-18 0h18" />
        </svg>
      ),
    },
    payments: {
      label: "Payment",
      bg: "rgba(16, 185, 129, 0.1)",
      text: "#10B981",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-19.5 5.25h19.5m-19.5 0h19.5M4 18h16a1 1 0 001-1V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1z" />
        </svg>
      ),
    },
    attendance: {
      label: "Attendance",
      bg: "rgba(139, 92, 246, 0.1)",
      text: "#8B5CF6",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const badgeColors: Record<string, { bg: string; text: string }> = {
    green: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
    red: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
    yellow: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
    blue: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
    gray: { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" },
  };

  const config = categoryConfig[result.category] || {
    label: result.category,
    bg: "rgba(107, 114, 128, 0.1)",
    text: "#6B7280",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
      </svg>
    ),
  };

  const badgeConfig = result.badge_color ? badgeColors[result.badge_color] : undefined;

  return (
    <div
      onClick={onSelect}
      className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-200 ${
        active
          ? "bg-slate-100/80 dark:bg-slate-800/80 border border-indigo-500/20 translate-x-1"
          : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Category Branded Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: config.bg, color: config.text }}
        >
          {config.icon}
        </div>

        {/* Text Details */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate text-slate-800 dark:text-slate-200">
              {result.title}
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
              style={{ backgroundColor: config.bg, color: config.text }}
            >
              {config.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate max-w-xl">
            {result.subtitle}
          </p>
        </div>
      </div>

      {/* Right side status badge if present */}
      {result.badge && (
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
          style={
            badgeConfig
              ? { backgroundColor: badgeConfig.bg, color: badgeConfig.text }
              : { backgroundColor: "rgba(107, 114, 128, 0.1)", color: "#6B7280" }
          }
        >
          {result.badge}
        </span>
      )}
    </div>
  );
}
