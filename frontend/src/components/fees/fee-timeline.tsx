"use client";

import React from "react";
import FeeRecordCard from "./fee-record-card";

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

interface FeeTimelineProps {
  records: FeeRecord[];
  onRecordPayment: (record: FeeRecord) => void;
  onUpdateBilling?: (record: FeeRecord, discount: number, discountReason: string, extra: number, extraReason: string) => Promise<void>;
}

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function getTimelineMarkerColor(status: string): string {
  switch (status) {
    case "paid":
      return "var(--accent-success)";
    case "partially_paid":
      return "var(--accent-warning)";
    default:
      return "var(--accent-danger)";
  }
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function FeeTimeline({
  records,
  onRecordPayment,
  onUpdateBilling,
}: FeeTimelineProps) {
  if (records.length === 0) {
    return (
      <div className="p-8 text-center border rounded-xl" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>
          No billing records found for this student.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 sm:pl-8 space-y-6">
      {/* Vertical line connector */}
      <div
        className="absolute left-3 sm:left-4 top-2 bottom-2 w-0.5"
        style={{ backgroundColor: "var(--card-border)" }}
      />

      {records.map((record) => {
        const markerColor = getTimelineMarkerColor(record.status);
        return (
          <div key={record.id} className="relative">
            {/* Timeline Marker Dot */}
            <div
              className="absolute -left-9 sm:-left-10 top-6 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 transition-all duration-300"
              style={{
                backgroundColor: markerColor,
                boxShadow: `0 0 0 3px rgba(226, 232, 240, 0.4), 0 0 8px ${markerColor}`,
              }}
            />

            {/* Fee Record Card */}
            <FeeRecordCard
              record={record}
              onRecordPayment={onRecordPayment}
              onUpdateBilling={onUpdateBilling}
            />
          </div>
        );
      })}
    </div>
  );
}
