"use client";

import React from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export default function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: ChartCardProps) {
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
      <div className="px-6 pt-5 pb-2">
        <h3
          className="text-base font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className="mt-0.5 text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Chart content */}
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}
