"use client";

import React from "react";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface BatchInfo {
  id: string;
  name: string;
  subject: string;
  teacher: string;
  days: string[];
  timing: string;
  max_students: number;
  student_count: number;
  description: string | null;
  created_at: string;
}

interface BatchInfoCardProps {
  batch: BatchInfo;
  onEdit?: () => void;
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function BatchInfoCard({ batch, onEdit }: BatchInfoCardProps) {
  const capacityPercent = batch.max_students > 0
    ? Math.round((batch.student_count / batch.max_students) * 100)
    : 0;
  const isNearFull = capacityPercent >= 80;
  const isFull = capacityPercent >= 100;

  // SVG progress ring parameters
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (capacityPercent / 100) * circumference;

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
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "var(--gradient-primary)" }}
          >
            {batch.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {batch.name}
            </h3>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Created {new Date(batch.created_at).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
            style={{ borderColor: "var(--card-border)", color: "var(--accent-primary)" }}
          >
            Edit
          </button>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <InfoItem label="Subject" value={batch.subject} />
        <InfoItem label="Teacher" value={batch.teacher} />
        <InfoItem label="Days" value={batch.days.join(", ")} />
        <InfoItem label="Timing" value={batch.timing} />
      </div>

      {/* Capacity Ring */}
      <div
        className="flex items-center gap-4 p-4 rounded-xl"
        style={{ backgroundColor: "var(--background)" }}
      >
        <div className="relative flex-shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80">
            {/* Background circle */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="var(--card-border)"
              strokeWidth="6"
            />
            {/* Progress arc */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke={isFull ? "var(--accent-danger)" : isNearFull ? "var(--accent-warning)" : "var(--accent-primary)"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "50% 50%",
                transition: "stroke-dashoffset 0.8s ease-out",
              }}
            />
          </svg>
          <div
            className="absolute inset-0 flex items-center justify-center text-sm font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {capacityPercent}%
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {batch.student_count} / {batch.max_students} Students
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {isFull
              ? "Batch is full"
              : isNearFull
              ? "Almost full"
              : `${batch.max_students - batch.student_count} spots remaining`}
          </p>
        </div>
      </div>

      {/* Description */}
      {batch.description && (
        <div className="mt-4">
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
            Description
          </p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {batch.description}
          </p>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Sub Components
   ────────────────────────────────────────────── */

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </p>
      <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
