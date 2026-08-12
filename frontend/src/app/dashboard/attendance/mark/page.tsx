"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AttendanceSheet, { AttendanceRecord } from "@/components/attendance/attendance-sheet";

/* ──────────────────────────────────────────────
   Mock Data
   ────────────────────────────────────────────── */

const MOCK_TEMPLATE: AttendanceRecord[] = [];

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

/* ──────────────────────────────────────────────
   Main Content Component
   ────────────────────────────────────────────── */

function MarkAttendanceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const batchId = searchParams.get("batch_id") || "";
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const [batchName, setBatchName] = useState("Loading batch...");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadAttendanceSheet() {
      if (!batchId) {
        setError("Invalid request parameters: Batch ID is missing.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`${API_BASE}/attendance/batch/${batchId}?date=${date}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setBatchName(data.batch_name);
          setRecords(data.records);
        } else {
          throw new Error();
        }
      } catch {
        // Fallback Mock
        setBatchName("Batch 1 (03:00 PM - 05:00 PM)");
        setRecords(MOCK_TEMPLATE);
      }
      setLoading(false);
    }
    loadAttendanceSheet();
  }, [batchId, date]);

  const handleRecordChange = (studentId: string, field: "status" | "remarks", value: any) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.student_id === studentId) {
          return { ...rec, [field]: value };
        }
        return rec;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const payload = {
      batch_id: batchId,
      date: date,
      records: records.map((r) => ({
        student_id: r.student_id,
        status: r.status,
        remarks: r.remarks,
      })),
    };

    try {
      const res = await fetch(`${API_BASE}/attendance`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard/attendance");
        }, 1500);
      } else {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to submit attendance sheet.");
      }
    } catch (err: any) {
      setError(err.message || "Offline Error: Submitting attendance requires an active backend server connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading class attendance sheet...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => router.push("/dashboard/attendance")}
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
          Back to Attendance
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Mark Attendance
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Batch: <b>{batchName}</b> · Date: <b>{new Date(date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}</b>
            </p>
          </div>
        </div>
      </div>

      {/* ERROR Banner */}
      {error && (
        <div
          className="p-3 rounded-lg border text-sm font-semibold max-w-4xl mx-auto"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            borderColor: "rgba(239, 68, 68, 0.2)",
            color: "var(--accent-danger)",
          }}
        >
          {error}
        </div>
      )}

      {/* SUCCESS Banner */}
      {success && (
        <div
          className="p-3 rounded-lg border text-sm font-semibold max-w-4xl mx-auto"
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            borderColor: "rgba(16, 185, 129, 0.2)",
            color: "var(--accent-success)",
          }}
        >
          Attendance sheet saved successfully! Redirecting...
        </div>
      )}

      {/* Marking form */}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
        <AttendanceSheet records={records} onChange={handleRecordChange} />
        
        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--card-border)" }}>
          <button
            type="button"
            onClick={() => router.push("/dashboard/attendance")}
            className="px-4 py-2 border rounded-lg text-sm font-semibold transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
            style={{
              borderColor: "var(--card-border)",
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02]"
            style={{
              background: "var(--gradient-success)",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit Attendance"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Page Wrapper
   ────────────────────────────────────────────── */

export default function MarkAttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-sm" style={{ color: "var(--text-secondary)" }}>
            Loading sheet setup...
          </div>
        </div>
      }
    >
      <MarkAttendanceForm />
    </Suspense>
  );
}
