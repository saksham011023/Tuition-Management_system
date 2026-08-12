"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NewBatchPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: BatchFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/batches`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push("/dashboard/batches");
      } else {
        const errorData = await res.json().catch(() => null);
        setError(errorData?.message || "Failed to create batch. Please try again.");
      }
    } catch {
      setError("Server is offline. Please ensure the backend is running.");
    }

    setIsSubmitting(false);
  };

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
          Back to Batches
        </button>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Create New Batch
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Set up a new batch with schedule, subject, and capacity details.
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
      <BatchForm onSubmit={handleSubmit} isSubmitting={isSubmitting} submitButtonText="Create Batch" />
    </div>
  );
}
