"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import BatchForm, { BatchFormData } from "@/components/batches/batch-form";

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

export default function EditBatchPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.id as string;

  const [initialData, setInitialData] = useState<Partial<BatchFormData> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBatch() {
      try {
        const res = await fetch(`${API_BASE}/batches/${batchId}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setInitialData({
            name: data.name,
            subject: data.subject,
            teacher: data.teacher,
            days: data.days,
            timing: data.timing,
            max_students: data.max_students,
            description: data.description || "",
          });
        } else {
          setError("Batch not found.");
        }
      } catch {
        setError("Could not connect to server.");
      }
      setLoading(false);
    }
    loadBatch();
  }, [batchId]);

  const handleSubmit = async (data: BatchFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/batches/${batchId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push(`/dashboard/batches/${batchId}`);
      } else {
        const errorData = await res.json().catch(() => null);
        setError(errorData?.message || "Failed to update batch. Please try again.");
      }
    } catch {
      setError("Server is offline. Please ensure the backend is running.");
    }

    setIsSubmitting(false);
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

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
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
          Back to Batch
        </button>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Edit Batch
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Update batch details, schedule, and capacity settings.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="p-3 rounded-lg border text-sm font-medium"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            borderColor: "rgba(239, 68, 68, 0.2)",
            color: "var(--accent-danger)",
          }}
        >
          {error}
        </div>
      )}

      {/* Form */}
      {initialData && (
        <BatchForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitButtonText="Update Batch"
        />
      )}
    </div>
  );
}
