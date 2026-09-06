"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import CollectionReport from "@/components/fees/collection-report";
import PendingFeesTable from "@/components/fees/pending-fees-table";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface PendingFee {
  id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  month: string;
  net_amount: number;
  paid_amount: number;
  balance: number;
  due_date: string;
  days_overdue: number;
  parent_name?: string;
  parent_mobile?: string;
}

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

/* ──────────────────────────────────────────────
   Mock Data
   ────────────────────────────────────────────── */

const INITIAL_REPORT: MonthlyReport = {
  month: new Date().toISOString().slice(0, 7),
  total_expected: 0,
  total_collected: 0,
  total_pending: 0,
  collection_rate: 0,
  by_mode: {
    upi: 0,
    bank_transfer: 0,
    cash: 0,
  },
};

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function FeesDashboardPage() {
  const router = useRouter();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [report, setReport] = useState<MonthlyReport>(INITIAL_REPORT);
  const [pendingItems, setPendingItems] = useState<PendingFee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Generation state
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState<string | null>(null);

  const fetchFeesData = async () => {
    setLoading(true);
    try {
      // Fetch report
      const repRes = await apiClient.get(`/fees/report/${month}`);
      setReport(repRes.data);

      // Fetch pending list
      const params: Record<string, string> = { month };
      if (search) params.search = search;
      
      const pendRes = await apiClient.get("/fees/pending", { params });
      setPendingItems(pendRes.data);
    } catch (err) {
      console.error("Failed to fetch fees data:", err);
      // Fallback
      setReport(INITIAL_REPORT);
      setPendingItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeesData();
  }, [month, search]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenStatus("Generating billing records...");
    try {
      const res = await apiClient.post("/fees/generate", { month });
      const data = res.data;
      setGenStatus(
        `Success: Created ${data.generated_count} fee record(s). Skipped ${data.skipped_count} existing records.`
      );
      fetchFeesData();
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || err.message || "Failed to generate monthly fee records.";
      setGenStatus(`Error: ${errMsg}`);
    } finally {
      setGenerating(false);
      setTimeout(() => setGenStatus(null), 6000);
    }
  };

  const handleRecordPayment = (item: PendingFee) => {
    // Save selection in session storage to pass to recording page
    sessionStorage.setItem("selected_payment_record", JSON.stringify(item));
    router.push(`/dashboard/fees/record`);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Fee Management
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Monitor cashflow collection aggregates, process ledger payments, and view billing histories.
          </p>
        </div>
      </div>

      {/* Control / Config Bar */}
      <div
        className="p-5 rounded-xl border flex flex-col md:flex-row md:items-center gap-4 justify-between"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* Month selector */}
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase text-slate-400">Target Billing Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--card-border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Quick Generate */}
          <div className="self-end pb-0.5">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02]"
              style={{
                background: "var(--gradient-primary)",
                boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
              }}
            >
              {generating ? "Generating..." : "Generate Monthly Billings"}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="w-full md:w-80">
          <label className="block text-xs font-bold mb-1.5 uppercase text-slate-400">Search Outstanding Due</label>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student name..."
              className="w-full pl-9 pr-4 py-1.5 border rounded-lg text-sm focus:outline-none"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--card-border)",
                color: "var(--text-primary)",
              }}
            />
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 absolute left-3 top-2.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Generation Status Alert Banner */}
      {genStatus && (
        <div
          className="p-3 rounded-lg border text-sm font-semibold animate-fade-in"
          style={{
            backgroundColor: genStatus.startsWith("Success") ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
            borderColor: genStatus.startsWith("Success") ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
            color: genStatus.startsWith("Success") ? "var(--accent-success)" : "var(--accent-danger)",
          }}
        >
          {genStatus}
        </div>
      )}

      {/* Report Summary */}
      <div className="grid grid-cols-1 gap-6">
        <CollectionReport report={report} />
      </div>

      {/* Pending Fees Table Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Outstanding Payments Checklist
          </h4>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-pulse text-sm" style={{ color: "var(--text-secondary)" }}>
              Loading pending checklist...
            </div>
          </div>
        ) : (
          <PendingFeesTable items={pendingItems} onRecordPayment={handleRecordPayment} />
        )}
      </div>
    </div>
  );
}
