"use client";

import React from "react";
import type { ExportFormat, ReportType } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function buildExportUrl(
  reportType: ReportType,
  format: ExportFormat,
  startDate: string,
  endDate: string,
  batchId?: string,
  asOf?: string,
): string {
  const base = `${API}/reports`;
  const params = new URLSearchParams();

  if (reportType === "pending_fees") {
    params.set("as_of", asOf || endDate);
    params.set("format", format);
    return `${base}/pending-fees/export?${params}`;
  }

  params.set("start_date", startDate);
  params.set("end_date", endDate);
  params.set("format", format);

  const endpoints: Record<ReportType, string> = {
    fee_collection: `${base}/fee-collection/export`,
    pending_fees: `${base}/pending-fees/export`,
    attendance: `${base}/attendance/export`,
    student_performance: `${base}/student-performance/export`,
    batch: `${base}/batch/export`,
    monthly_summary: `${base}/monthly-summary/export`,
  };

  if (reportType === "attendance" && batchId) {
    params.set("batch_id", batchId);
  }

  return `${endpoints[reportType]}?${params}`;
}

/* ──────────────────────────────────────────────
   Props
   ────────────────────────────────────────────── */

interface ExportActionsProps {
  reportType: ReportType;
  startDate: string;
  endDate: string;
  batchId?: string;
  hasData: boolean;
}

export default function ExportActions({
  reportType,
  startDate,
  endDate,
  batchId,
  hasData,
}: ExportActionsProps) {
  const handleExport = (format: ExportFormat) => {
    if (!hasData) return;
    const url = buildExportUrl(reportType, format, startDate, endDate, batchId, endDate);
    // Open in new tab — browser will download the file
    window.open(url, "_blank");
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        Export:
      </span>

      {/* PDF Button */}
      <button
        onClick={() => handleExport("pdf")}
        disabled={!hasData}
        title="Download as PDF"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 hover:opacity-90 active:scale-95 disabled:opacity-40"
        style={{
          borderColor: "#EF4444",
          color: "#EF4444",
          backgroundColor: "#EF444412",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
        PDF
      </button>

      {/* Excel Button */}
      <button
        onClick={() => handleExport("excel")}
        disabled={!hasData}
        title="Download as Excel"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 hover:opacity-90 active:scale-95 disabled:opacity-40"
        style={{
          borderColor: "#10B981",
          color: "#10B981",
          backgroundColor: "#10B98112",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 19.5m9.75-9.75c0 .621-.504 1.125-1.125 1.125H12m8.625-1.125c0 .621.504 1.125 1.125 1.125M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
        </svg>
        Excel
      </button>
    </div>
  );
}
