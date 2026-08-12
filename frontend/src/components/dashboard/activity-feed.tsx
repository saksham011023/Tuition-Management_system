"use client";

import React from "react";

interface ActivityFeedProps {
  title: string;
  /** Optional "View All" link */
  viewAllHref?: string;
  children: React.ReactNode;
  className?: string;
}

export default function ActivityFeed({
  title,
  viewAllHref,
  children,
  className = "",
}: ActivityFeedProps) {
  return (
    <div
      className={`rounded-xl border overflow-hidden animate-fade-in ${className}`}
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <h3
          className="text-base font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h3>
        {viewAllHref && (
          <a
            href={viewAllHref}
            className="text-xs font-medium transition-colors duration-200"
            style={{ color: "var(--accent-primary)" }}
            onMouseEnter={(e) => {
              (e.target as HTMLAnchorElement).style.color =
                "var(--accent-primary-light)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLAnchorElement).style.color =
                "var(--accent-primary)";
            }}
          >
            View All →
          </a>
        )}
      </div>

      {/* Items */}
      <div className="px-1 pb-2 divide-y divide-slate-100 dark:divide-slate-800">
        {children}
      </div>
    </div>
  );
}
