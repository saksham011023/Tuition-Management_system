"use client";

import React, { useState, useEffect, useCallback } from "react";
import type {
  ReportType,
  DateRange,
  FeeCollectionReport,
  PendingFeesReport,
  AttendanceReport,
  StudentPerformanceReport,
  BatchReport,
  MonthlySummaryReport,
} from "@/components/reports/types";
import ReportSelector from "@/components/reports/report-selector";
import ReportFilters from "@/components/reports/report-filters";
import ExportActions from "@/components/reports/export-actions";
import {
  FeeCollectionPreview,
  PendingFeesPreview,
  AttendancePreview,
  StudentPerformancePreview,
  BatchPreview,
  MonthlySummaryPreview,
} from "@/components/reports/report-preview";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/* ──────────────────────────────────────────────
   Date helpers
   ────────────────────────────────────────────── */

function defaultRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

/* ──────────────────────────────────────────────
   Fetch helpers
   ────────────────────────────────────────────── */

type ReportData =
  | FeeCollectionReport
  | PendingFeesReport
  | AttendanceReport
  | StudentPerformanceReport
  | BatchReport
  | MonthlySummaryReport
  | null;

async function fetchReport(
  type: ReportType,
  range: DateRange,
  batchId: string,
): Promise<ReportData> {
  const params = new URLSearchParams();

  if (type === "pending_fees") {
    params.set("as_of", range.endDate);
  } else {
    params.set("start_date", range.startDate);
    params.set("end_date", range.endDate);
  }

  if (type === "attendance" && batchId) {
    params.set("batch_id", batchId);
  }

  const endpointMap: Record<ReportType, string> = {
    fee_collection: "/reports/fee-collection",
    pending_fees: "/reports/pending-fees",
    attendance: "/reports/attendance",
    student_performance: "/reports/student-performance",
    batch: "/reports/batch",
    monthly_summary: "/reports/monthly-summary",
  };

  const token = typeof window !== "undefined" ? (localStorage.getItem("access_token") || localStorage.getItem("token")) : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API}${endpointMap[type]}?${params}`, { headers });
  if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchBatches(): Promise<{ id: string; name: string }[]> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("access_token") || localStorage.getItem("token")) : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API}/batches?page_size=100`, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? data ?? []).map((b: any) => ({ id: b.id, name: b.name }));
}

/* ──────────────────────────────────────────────
   Page Component
   ────────────────────────────────────────────── */

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("fee_collection");
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);
  const [batchId, setBatchId] = useState<string>("");
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<ReportData>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    fetchBatches().then(setBatches);
  }, []);

  // Reset data when report type changes
  useEffect(() => {
    setData(null);
    setGenerated(false);
    setError(null);
  }, [reportType]);

  const generate = useCallback(async () => {
    if (!dateRange.startDate || !dateRange.endDate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchReport(reportType, dateRange, batchId);
      setData(result);
      setGenerated(true);
    } catch (e: any) {
      setError(e.message ?? "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [reportType, dateRange, batchId]);

  const hasData = data !== null && !loading;

  return (
    <div className="space-y-6 max-w-full">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Reports
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Generate, preview, and export detailed reports with custom date ranges
          </p>
        </div>

        {/* Export buttons — shown when report is ready */}
        {hasData && (
          <ExportActions
            reportType={reportType}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            batchId={batchId || undefined}
            hasData={hasData}
          />
        )}
      </div>

      {/* Two-column layout: selector+filters on left, preview on right */}
      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">

        {/* ── Left Panel ── */}
        <div className="space-y-4">
          {/* Report type picker */}
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              Select Report Type
            </h3>
            <ReportSelector selected={reportType} onChange={setReportType} />
          </div>

          {/* Filters + generate */}
          <ReportFilters
            reportType={reportType}
            dateRange={dateRange}
            batchId={batchId}
            batches={batches}
            onDateRangeChange={setDateRange}
            onBatchChange={setBatchId}
            onGenerate={generate}
            loading={loading}
          />
        </div>

        {/* ── Right Panel: Preview ── */}
        <div
          className="rounded-xl border min-h-[400px]"
          style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}
        >
          {/* Preview header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: "var(--card-border)" }}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Report Preview
              </h3>
              {generated && !loading && (
                <span
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: "#10B98118", color: "#10B981" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Ready
                </span>
              )}
            </div>
            {hasData && (
              <ExportActions
                reportType={reportType}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                batchId={batchId || undefined}
                hasData={hasData}
              />
            )}
          </div>

          {/* Content area */}
          <div className="p-5">
            {loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="relative w-14 h-14">
                  <div
                    className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"
                    style={{ borderColor: "var(--card-border)", borderTopColor: "#4F46E5" }}
                  />
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Generating report…
                </p>
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#EF444418" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={1.5} className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold" style={{ color: "#EF4444" }}>Failed to load report</p>
                <p className="text-xs text-center max-w-xs" style={{ color: "var(--text-secondary)" }}>{error}</p>
                <button
                  onClick={generate}
                  className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && !generated && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                    Select a report type &amp; click Generate
                  </p>
                  <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                    Set the date range on the left, then export as PDF or Excel
                  </p>
                </div>
              </div>
            )}

            {!loading && !error && data && (
              <div className="overflow-auto">
                {reportType === "fee_collection" && (
                  <FeeCollectionPreview data={data as FeeCollectionReport} />
                )}
                {reportType === "pending_fees" && (
                  <PendingFeesPreview data={data as PendingFeesReport} />
                )}
                {reportType === "attendance" && (
                  <AttendancePreview data={data as AttendanceReport} />
                )}
                {reportType === "student_performance" && (
                  <StudentPerformancePreview data={data as StudentPerformanceReport} />
                )}
                {reportType === "batch" && (
                  <BatchPreview data={data as BatchReport} />
                )}
                {reportType === "monthly_summary" && (
                  <MonthlySummaryPreview data={data as MonthlySummaryReport} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
