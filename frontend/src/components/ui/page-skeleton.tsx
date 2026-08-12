import React from "react";
import { Skeleton } from "./skeleton";

export function StatSkeleton() {
  return (
    <div
      className="p-6 rounded-xl border flex flex-col gap-2"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-16 mt-1" />
      <Skeleton className="h-3 w-32 mt-2" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      {/* Table Header */}
      <div
        className="px-6 py-4 border-b flex items-center justify-between gap-4"
        style={{ borderColor: "var(--card-border)", backgroundColor: "rgba(0,0,0,0.02)" }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-28" />
        ))}
      </div>

      {/* Table Body Rows */}
      <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-6 py-5 flex items-center justify-between gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className="h-4"
                style={{
                  width: `${30 + (c % 3) * 15 + (r % 2) * 10}%`,
                  maxWidth: "180px",
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div
      className="p-6 rounded-xl border flex flex-col gap-4"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="flex justify-between items-center mt-2">
        <Skeleton className="h-6 w-16 rounded" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>

      {/* Split main section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TableSkeleton rows={4} cols={3} />
        </div>
        <div>
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
