"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import BatchInfoCard from "@/components/batches/batch-info-card";
import BatchScheduleStrip from "@/components/batches/batch-schedule-strip";
import BatchAttendanceSummary from "@/components/batches/batch-attendance-summary";
import BatchStudentsPanel from "@/components/batches/batch-students-panel";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface BatchStudent {
  id: string;
  name: string;
  class_name: string;
  is_active: boolean;
  joining_date?: string;
}

interface AttendanceSummaryData {
  total_sessions: number;
  total_present: number;
  total_absent: number;
  avg_present_rate: number;
  avg_absent_rate: number;
}

interface BatchDetail {
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
  updated_at: string;
  students: BatchStudent[];
  attendance_summary: AttendanceSummaryData;
}

/* ──────────────────────────────────────────────
   Mock Data
   ────────────────────────────────────────────── */

const MOCK_BATCH: BatchDetail = {
  id: "batch-1",
  name: "Batch 1 (03:00 PM - 05:00 PM)",
  subject: "All Subjects",
  teacher: "Academy Teacher",
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  timing: "03:00 PM - 05:00 PM",
  max_students: 30,
  student_count: 0,
  description: "Daily afternoon batch from 3:00 PM to 5:00 PM",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  students: [],
  attendance_summary: {
    total_sessions: 120,
    total_present: 108,
    total_absent: 12,
    avg_present_rate: 90.0,
    avg_absent_rate: 10.0,
  },
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
   Page Component
   ────────────────────────────────────────────── */

export default function BatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatch = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/batches/${batchId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBatch(data);
      } else {
        throw new Error();
      }
    } catch {
      // Fallback mock
      setBatch(MOCK_BATCH);
    }
    setLoading(false);
  }, [batchId]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  const handleAssignStudents = async (studentIds: string[]) => {
    try {
      const res = await fetch(`${API_BASE}/batches/${batchId}/students`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_ids: studentIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setBatch(data);
      } else {
        const errData = await res.json().catch(() => null);
        alert(errData?.message || "Failed to assign students.");
      }
    } catch {
      alert("Server offline. Cannot assign students.");
    }
  };

  const handleRemoveStudents = async (studentIds: string[]) => {
    try {
      const res = await fetch(`${API_BASE}/batches/${batchId}/students`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_ids: studentIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setBatch(data);
      } else {
        const errData = await res.json().catch(() => null);
        alert(errData?.message || "Failed to remove students.");
      }
    } catch {
      alert("Server offline. Cannot remove students.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this batch? This action cannot be undone.")) return;
    try {
      const res = await fetch(`${API_BASE}/batches/${batchId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        router.push("/dashboard/batches");
      } else {
        alert("Failed to delete batch.");
      }
    } catch {
      alert("Server offline.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading batch details...
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-sm" style={{ color: "var(--accent-danger)" }}>Batch not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/dashboard/batches")}
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
            Back to Batches
          </button>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {batch.name}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {batch.subject} · {batch.teacher}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/dashboard/batches/${batchId}/edit`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border hover:bg-indigo-50 dark:hover:bg-indigo-950"
            style={{ borderColor: "var(--card-border)", color: "var(--accent-primary)" }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
            </svg>
            Edit Batch
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/20"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path
                fillRule="evenodd"
                d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 1 .7.797l-.3 5a.75.75 0 0 1-1.497-.09l.3-5a.75.75 0 0 1 .797-.707Zm3.637.707a.75.75 0 0 0-1.497.09l.3 5a.75.75 0 1 0 1.497-.09l-.3-5Z"
                clipRule="evenodd"
              />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Batch Info + Schedule + Attendance */}
        <div className="space-y-6">
          <BatchInfoCard
            batch={batch}
            onEdit={() => router.push(`/dashboard/batches/${batchId}/edit`)}
          />
          <BatchScheduleStrip days={batch.days} timing={batch.timing} />
          <BatchAttendanceSummary summary={batch.attendance_summary} />
        </div>

        {/* Right Column: Students Panel (spans 2 cols) */}
        <div className="lg:col-span-2">
          <BatchStudentsPanel
            batchId={batchId}
            students={batch.students}
            maxStudents={batch.max_students}
            onAssign={handleAssignStudents}
            onRemove={handleRemoveStudents}
          />
        </div>
      </div>
    </div>
  );
}
