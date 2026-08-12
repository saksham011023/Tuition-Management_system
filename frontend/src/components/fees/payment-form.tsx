"use client";

import React, { useState } from "react";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

export interface PaymentFormData {
  amount: number;
  date: string;
  mode: "cash" | "upi" | "bank_transfer";
  transaction_id: string;
  notes: string;
}

interface FeeRecord {
  id: string;
  month: string;
  net_amount: number;
  paid_amount: number;
  balance: number;
}

interface PaymentFormProps {
  record: FeeRecord;
  studentName: string;
  onSubmit: (data: PaymentFormData) => void;
  isSubmitting?: boolean;
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

export default function PaymentForm({
  record,
  studentName,
  onSubmit,
  isSubmitting = false,
}: PaymentFormProps) {
  const [amount, setAmount] = useState<number>(record.balance);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [mode, setMode] = useState<"cash" | "upi" | "bank_transfer">("upi");
  const [transactionId, setTransactionId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError("Payment amount must be greater than zero");
      return;
    }

    onSubmit({
      amount,
      date,
      mode,
      transaction_id: transactionId,
      notes,
    });
  };

  const remaining = record.balance - amount;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 max-w-xl mx-auto rounded-xl border p-5 md:p-6"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      {/* Header Info */}
      <div className="pb-3 border-b" style={{ borderColor: "var(--card-border)" }}>
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Record Fee Payment</h4>
        <div className="mt-1">
          <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{studentName}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Billing for <b>{formatMonth(record.month)}</b>
          </p>
        </div>
      </div>

      {/* Grid summary */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-lg text-center" style={{ backgroundColor: "var(--background)" }}>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400">Net Due</span>
          <p className="text-sm font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
            ₹{record.net_amount.toLocaleString("en-IN")}
          </p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400">Paid So Far</span>
          <p className="text-sm font-bold mt-0.5" style={{ color: "var(--accent-success)" }}>
            ₹{record.paid_amount.toLocaleString("en-IN")}
          </p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400">Balance Due</span>
          <p className="text-sm font-bold mt-0.5" style={{ color: "var(--accent-danger)" }}>
            ₹{record.balance.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div
          className="p-3 rounded-lg border text-xs font-semibold"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            borderColor: "rgba(239, 68, 68, 0.2)",
            color: "var(--accent-danger)",
          }}
        >
          {error}
        </div>
      )}

      {/* Inputs */}
      <div className="space-y-4">
        {/* Amount */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              Payment Amount (₹) *
            </label>
            {remaining < 0 && (
              <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                Extra payment: +₹{Math.abs(remaining).toLocaleString("en-IN")}
              </span>
            )}
          </div>
          <input
            type="number"
            required
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Payment Date */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Payment Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--card-border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Mode */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Payment Mode *
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--card-border)",
                color: "var(--text-primary)",
              }}
            >
              <option value="upi">UPI / GPay / PhonePe</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
        </div>

        {/* Transaction ID */}
        {mode !== "cash" && (
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              UPI Transaction ID / Ref Number *
            </label>
            <input
              type="text"
              required
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Enter reference ID"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--card-border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Internal Payment Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add payment context, depositor name, etc."
            rows={2}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none resize-none"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: "var(--card-border)" }}>
        <button
          type="button"
          onClick={() => window.history.back()}
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
          {isSubmitting ? "Saving..." : "Record Payment"}
        </button>
      </div>
    </form>
  );
}
