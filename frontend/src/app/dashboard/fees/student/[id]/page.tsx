"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import FeeTimeline from "@/components/fees/fee-timeline";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface Transaction {
  id: string;
  amount: number;
  date: string;
  mode: string;
  receipt_number: string;
  transaction_id?: string | null;
  notes?: string | null;
}

interface FeeRecord {
  id: string;
  month: string;
  base_amount: number;
  discount: number;
  discount_reason?: string | null;
  extra_charges: number;
  extra_charges_reason?: string | null;
  net_amount: number;
  due_date: string;
  notes?: string | null;
  paid_amount: number;
  balance: number;
  status: string;
  transactions: Transaction[];
}

interface StudentTimelineData {
  student_id: string;
  student_name: string;
  monthly_fee: number;
  total_expected: number;
  total_paid: number;
  total_outstanding: number;
  records: FeeRecord[];
}

/* ──────────────────────────────────────────────
   Mock Data
   ────────────────────────────────────────────── */

const MOCK_TIMELINE: StudentTimelineData = {
  student_id: "stud-3",
  student_name: "Rohan Gupta",
  monthly_fee: 3500,
  total_expected: 7000,
  total_paid: 3500,
  total_outstanding: 3500,
  records: [
    {
      id: "record-1",
      month: "2026-07",
      base_amount: 3500,
      discount: 0,
      discount_reason: null,
      extra_charges: 0,
      extra_charges_reason: null,
      net_amount: 3500,
      due_date: "2026-07-10",
      notes: "Auto-generated July fees",
      paid_amount: 0,
      balance: 3500,
      status: "pending",
      transactions: [],
    },
    {
      id: "record-2",
      month: "2026-06",
      base_amount: 3500,
      discount: 500,
      discount_reason: "Merit Discount",
      extra_charges: 500,
      extra_charges_reason: "Material Charges",
      net_amount: 3500,
      due_date: "2026-06-10",
      notes: "June fees with adjustments",
      paid_amount: 3500,
      balance: 0,
      status: "paid",
      transactions: [
        {
          id: "tx-1",
          amount: 3500,
          date: "2026-06-08",
          mode: "upi",
          receipt_number: "TMS-2026-0038",
          transaction_id: "UPI987654321",
          notes: "Full payment received online.",
        },
      ],
    },
  ],
};

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function StudentFeeTimelinePage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [timeline, setTimeline] = useState<StudentTimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/fees/student/${studentId}/timeline`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setTimeline(data);
      } else {
        throw new Error();
      }
    } catch {
      // Mock Fallback
      setTimeline(MOCK_TIMELINE);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const handleRecordPayment = (record: FeeRecord) => {
    // Pack payment details into session storage and redirect
    const payload = {
      id: record.id,
      student_id: studentId,
      student_name: timeline?.student_name || "Student",
      month: record.month,
      net_amount: record.net_amount,
      paid_amount: record.paid_amount,
      balance: record.balance,
    };
    sessionStorage.setItem("selected_payment_record", JSON.stringify(payload));
    router.push(`/dashboard/fees/record`);
  };

  const handleUpdateBilling = async (
    record: FeeRecord,
    discount: number,
    discountReason: string,
    extra: number,
    extraReason: string
  ) => {
    try {
      const res = await fetch(`${API_BASE}/fees/${record.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          discount,
          discount_reason: discountReason || null,
          extra_charges: extra,
          extra_charges_reason: extraReason || null,
        }),
      });

      if (res.ok) {
        // Re-fetch timeline on update success
        fetchTimeline();
      } else {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to update billing");
      }
    } catch (err: any) {
      alert(err.message || "Failed to update billing. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading fee timeline...
        </div>
      </div>
    );
  }

  if (!timeline) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm font-bold" style={{ color: "var(--accent-danger)" }}>
          Timeline details not found.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-fade-in">
      {/* Back button */}
      <div>
        <button
          onClick={() => router.push("/dashboard/fees")}
          className="inline-flex items-center gap-1 text-sm font-medium mb-3 transition-colors cursor-pointer hover:opacity-80"
          style={{ color: "var(--accent-primary)" }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
          Back to Fees Overview
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Fee Billing Timeline
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Detailed financial history for student: <b>{timeline.student_name}</b>
            </p>
          </div>
        </div>
      </div>

      {/* Aggregate metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="p-5 border rounded-xl"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Billed</span>
          <p className="text-2xl font-black mt-1" style={{ color: "var(--text-primary)" }}>
            ₹{timeline.total_expected.toLocaleString("en-IN")}
          </p>
        </div>

        <div
          className="p-5 border rounded-xl"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Paid Ledger</span>
          <p className="text-2xl font-black mt-1" style={{ color: "var(--accent-success)" }}>
            ₹{timeline.total_paid.toLocaleString("en-IN")}
          </p>
        </div>

        <div
          className="p-5 border rounded-xl relative overflow-hidden"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Remaining Balance Due</span>
          <p className="text-2xl font-black mt-1" style={{ color: "var(--accent-danger)" }}>
            ₹{timeline.total_outstanding.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Fee timeline lists */}
      <div className="space-y-4">
        <h4 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Ledger Billing Log
        </h4>

        <FeeTimeline
          records={timeline.records}
          onRecordPayment={handleRecordPayment}
          onUpdateBilling={handleUpdateBilling}
        />
      </div>
    </div>
  );
}
