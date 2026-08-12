"use client";

import React from "react";

interface Batch {
  id: string;
  name: string;
  description?: string | null;
}

export default function BatchesTab({ batches }: { batches: Batch[] }) {
  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
        Enrolled Batches
      </h3>
      {batches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="p-5 rounded-xl border flex flex-col justify-between"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--card-border)",
                boxShadow: "var(--card-shadow)",
              }}
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
                  Batch Group
                </span>
                <h4 className="text-base font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                  {batch.name}
                </h4>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  {batch.description || "No description provided."}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: "var(--card-border)", color: "var(--text-tertiary)" }}>
                <span>Standard Schedule</span>
                <span className="font-semibold" style={{ color: "var(--accent-primary)" }}>
                  Active Enrollment
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 rounded-lg border text-center italic" style={{ borderColor: "var(--card-border)", color: "var(--text-tertiary)" }}>
          Student is not assigned to any batches currently.
        </div>
      )}
    </div>
  );
}
