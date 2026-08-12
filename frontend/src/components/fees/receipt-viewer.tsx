"use client";

import React from "react";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface ReceiptData {
  receipt_number: string;
  student_name: string;
  month: string; // billing month
  amount: number;
  date: string;
  mode: string;
  transaction_id?: string | null;
  notes?: string | null;
}

interface ReceiptViewerProps {
  receipt: ReceiptData;
  onClose?: () => void;
}

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function formatMonth(monthStr: string): string {
  try {
    const [year, month] = monthStr.split("-");
    const dateObj = new Date(Number(year), Number(month) - 1, 1);
    return dateObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  } catch {
    return monthStr;
  }
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function ReceiptViewer({ receipt, onClose }: ReceiptViewerProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto print:p-0">
      {/* Receipt Envelope */}
      <div
        className="rounded-xl border p-6 space-y-6 relative overflow-hidden print:border-none print:shadow-none"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--card-shadow)",
        }}
        id="printable-receipt"
      >
        {/* Decorative receipt header stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: "var(--gradient-success)" }}
        />

        {/* Center Name */}
        <div className="text-center pb-4 border-b" style={{ borderColor: "var(--card-border)" }}>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Tuition Management System
          </h2>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Official Fee Payment Receipt
          </p>
        </div>

        {/* Receipt Meta */}
        <div className="flex justify-between items-start text-xs">
          <div>
            <span className="font-bold text-slate-400 block uppercase">Receipt No</span>
            <span className="text-sm font-extrabold" style={{ color: "var(--accent-primary)" }}>
              {receipt.receipt_number}
            </span>
          </div>
          <div className="text-right">
            <span className="font-bold text-slate-400 block uppercase">Payment Date</span>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {new Date(receipt.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Receipt Ledger Table */}
        <div className="space-y-3">
          <div className="flex justify-between border-b pb-2 text-xs font-bold" style={{ borderColor: "var(--card-border)" }}>
            <span style={{ color: "var(--text-secondary)" }}>Description</span>
            <span style={{ color: "var(--text-secondary)" }}>Amount</span>
          </div>

          <div className="flex justify-between text-sm py-1">
            <div>
              <span className="font-bold block" style={{ color: "var(--text-primary)" }}>
                Tuition Fee Payment
              </span>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Billing Month: {formatMonth(receipt.month)}
              </span>
            </div>
            <span className="font-extrabold" style={{ color: "var(--text-primary)" }}>
              ₹{receipt.amount.toLocaleString("en-IN")}
            </span>
          </div>

          {receipt.notes && (
            <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: "var(--background)", color: "var(--text-secondary)" }}>
              <b>Notes:</b> {receipt.notes}
            </div>
          )}

          {/* Transaction Metadata */}
          <div className="pt-3 border-t grid grid-cols-2 gap-4 text-xs" style={{ borderColor: "var(--card-border)" }}>
            <div>
              <span className="font-bold text-slate-400 block uppercase">Payment Mode</span>
              <span className="font-bold uppercase" style={{ color: "var(--text-secondary)" }}>
                {receipt.mode.replace("_", " ")}
              </span>
            </div>
            {receipt.transaction_id && (
              <div>
                <span className="font-bold text-slate-400 block uppercase">Transaction ID</span>
                <span className="font-mono break-all font-bold" style={{ color: "var(--text-secondary)" }}>
                  {receipt.transaction_id}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Total block */}
        <div className="p-4 rounded-xl flex justify-between items-center" style={{ backgroundColor: "var(--background)" }}>
          <span className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>
            Total Received
          </span>
          <span className="text-lg font-extrabold" style={{ color: "var(--accent-success)" }}>
            ₹{receipt.amount.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Signature stamp */}
        <div className="pt-6 flex justify-between items-end text-xs">
          <div className="text-slate-400 italic">
            Thank you for your payment!
          </div>
          <div className="text-center">
            <div className="w-28 border-b pb-1 mb-1" style={{ borderColor: "var(--card-border)" }} />
            <span className="font-bold" style={{ color: "var(--text-secondary)" }}>Authorized Signatory</span>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3 justify-center print:hidden">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm font-semibold transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
            style={{
              borderColor: "var(--card-border)",
              color: "var(--text-secondary)",
            }}
          >
            Close
          </button>
        )}
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold text-white transition-all cursor-pointer hover:scale-[1.02]"
          style={{
            background: "var(--gradient-primary)",
            boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
          }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path
              fillRule="evenodd"
              d="M5 4v3H4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2h1a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2Zm8 3H7V4h6v3Zm-1 8H8v2h4v-2Z"
              clipRule="evenodd"
            />
          </svg>
          Print Receipt
        </button>
      </div>
    </div>
  );
}
