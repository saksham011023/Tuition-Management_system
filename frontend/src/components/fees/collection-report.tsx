"use client";

import React from "react";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface ModeBreakdown {
  cash: number;
  upi: number;
  bank_transfer: number;
}

interface MonthlyReport {
  month: string;
  total_expected: number;
  total_collected: number;
  total_pending: number;
  collection_rate: number;
  by_mode: ModeBreakdown;
}

interface CollectionReportProps {
  report: MonthlyReport;
}

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function formatMonth(monthStr: string): string {
  try {
    const [year, month] = monthStr.split("-");
    const dateObj = new Date(Number(year), Number(month) - 1, 1);
    return dateObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  } catch {
    return monthStr;
  }
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function CollectionReport({ report }: CollectionReportProps) {
  const { total_expected, total_collected, total_pending, collection_rate, by_mode } = report;
  const totalModeSum = by_mode.cash + by_mode.upi + by_mode.bank_transfer;

  const cashPct = totalModeSum > 0 ? (by_mode.cash / totalModeSum) * 100 : 0;
  const upiPct = totalModeSum > 0 ? (by_mode.upi / totalModeSum) * 100 : 0;
  const bankPct = totalModeSum > 0 ? (by_mode.bank_transfer / totalModeSum) * 100 : 0;

  return (
    <div
      className="rounded-xl border p-5 md:p-6 space-y-6"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--card-border)" }}>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billing Month Report</span>
          <h4 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {formatMonth(report.month)}
          </h4>
        </div>
        <div
          className="w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black text-sm text-white"
          style={{ background: "var(--gradient-primary)" }}
        >
          {collection_rate}%
        </div>
      </div>

      {/* Grid numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ReportMetricCard
          label="Total Expected Billing"
          value={`₹${total_expected.toLocaleString("en-IN")}`}
          gradient="var(--gradient-purple)"
        />
        <ReportMetricCard
          label="Total Collected"
          value={`₹${total_collected.toLocaleString("en-IN")}`}
          gradient="var(--gradient-success)"
        />
        <ReportMetricCard
          label="Outstanding Balance"
          value={`₹${total_pending.toLocaleString("en-IN")}`}
          gradient="var(--gradient-danger)"
        />
      </div>

      {/* Progress metrics */}
      <div className="space-y-4 pt-2">
        <h5 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Payment Mode Breakdown
        </h5>
        
        {/* UPI */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>UPI / Online</span>
            <span className="font-bold" style={{ color: "var(--text-secondary)" }}>
              ₹{by_mode.upi.toLocaleString("en-IN")} ({Math.round(upiPct)}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--background)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${upiPct}%`,
                background: "var(--gradient-primary)",
              }}
            />
          </div>
        </div>

        {/* Bank Transfer */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Bank Transfer</span>
            <span className="font-bold" style={{ color: "var(--text-secondary)" }}>
              ₹{by_mode.bank_transfer.toLocaleString("en-IN")} ({Math.round(bankPct)}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--background)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${bankPct}%`,
                background: "var(--gradient-secondary)",
              }}
            />
          </div>
        </div>

        {/* Cash */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Cash</span>
            <span className="font-bold" style={{ color: "var(--text-secondary)" }}>
              ₹{by_mode.cash.toLocaleString("en-IN")} ({Math.round(cashPct)}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--background)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${cashPct}%`,
                background: "var(--gradient-warning)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Sub-Components
   ────────────────────────────────────────────── */

function ReportMetricCard({
  label,
  value,
  gradient,
}: {
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <div
      className="p-4 rounded-xl border relative overflow-hidden"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
      }}
    >
      <div className="absolute top-0 bottom-0 left-0 w-1" style={{ background: gradient }} />
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{label}</span>
      <p className="text-lg font-black mt-1" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
