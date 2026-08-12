"use client";

import React, { useState } from "react";

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
  status: string; // "pending" | "partially_paid" | "paid"
  transactions: Transaction[];
}

interface FeeRecordCardProps {
  record: FeeRecord;
  onRecordPayment: (record: FeeRecord) => void;
  onUpdateBilling?: (record: FeeRecord, discount: number, discountReason: string, extra: number, extraReason: string) => Promise<void>;
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

function getStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return (
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          Paid
        </span>
      );
    case "partially_paid":
      return (
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          Partially Paid
        </span>
      );
    default:
      return (
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
          Unpaid
        </span>
      );
  }
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function FeeRecordCard({
  record,
  onRecordPayment,
  onUpdateBilling,
}: FeeRecordCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Billing updates local state
  const [discount, setDiscount] = useState(record.discount);
  const [discountReason, setDiscountReason] = useState(record.discount_reason || "");
  const [extra, setExtra] = useState(record.extra_charges);
  const [extraReason, setExtraReason] = useState(record.extra_charges_reason || "");
  const [saving, setSaving] = useState(false);

  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateBilling) return;
    setSaving(true);
    try {
      await onUpdateBilling(record, discount, discountReason, extra, extraReason);
      setIsEditing(false);
    } catch {
      alert("Failed to update billing details");
    }
    setSaving(false);
  };

  const pct = record.net_amount > 0 ? (record.paid_amount / record.net_amount) * 100 : 0;

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all hover:shadow-md"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      {/* Upper header */}
      <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderColor: "var(--card-border)" }}>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billing Month</span>
          <h4 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {formatMonth(record.month)}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(record.status)}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg border text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
            style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
          >
            {expanded ? "Collapse" : "Details"}
          </button>
        </div>
      </div>

      {/* Main card body */}
      <div className="p-5 space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold mb-1">
            <span style={{ color: "var(--text-secondary)" }}>Collection Progress</span>
            <span style={{ color: "var(--text-primary)" }}>
              ₹{record.paid_amount.toLocaleString("en-IN")} / ₹{record.net_amount.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--background)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(pct, 100)}%`,
                background: "var(--gradient-primary)",
              }}
            />
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <InfoItem label="Base Amount" value={`₹${record.base_amount.toLocaleString("en-IN")}`} />
          <InfoItem label="Discount" value={record.discount > 0 ? `₹${record.discount.toLocaleString("en-IN")}` : "—"} />
          <InfoItem label="Extra Charges" value={record.extra_charges > 0 ? `₹${record.extra_charges.toLocaleString("en-IN")}` : "—"} />
          <InfoItem
            label="Outstanding Balance"
            value={`₹${record.balance.toLocaleString("en-IN")}`}
            highlight={record.balance > 0}
          />
        </div>

        {/* Timeline Notes */}
        {record.notes && (
          <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: "var(--background)", color: "var(--text-secondary)" }}>
            <b>Notes:</b> {record.notes}
          </div>
        )}

        {/* Expandable Section: Transactions & Details Modification */}
        {expanded && (
          <div className="pt-4 border-t space-y-4" style={{ borderColor: "var(--card-border)" }}>
            {/* Edit Billing toggle */}
            {onUpdateBilling && !isEditing && (
              <div className="flex justify-end">
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  Modify Discounts & Charges
                </button>
              </div>
            )}

            {/* Editing form */}
            {isEditing && (
              <form onSubmit={handleSaveBilling} className="space-y-3 p-4 rounded-lg border bg-slate-50/50 dark:bg-slate-800/10" style={{ borderColor: "var(--card-border)" }}>
                <h5 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                  Modify Billing Adjustments
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--text-secondary)" }}>Discount Amount (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none"
                      style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--text-secondary)" }}>Discount Reason</label>
                    <input
                      type="text"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="e.g. Merit Scholarship"
                      className="w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none"
                      style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--text-secondary)" }}>Extra Charges (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={extra}
                      onChange={(e) => setExtra(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none"
                      style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--text-secondary)" }}>Extra Reason</label>
                    <input
                      type="text"
                      value={extraReason}
                      onChange={(e) => setExtraReason(e.target.value)}
                      placeholder="e.g. Study Material Fee"
                      className="w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none"
                      style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 border rounded-lg text-xs font-semibold cursor-pointer"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-1 rounded-lg text-xs font-bold text-white cursor-pointer"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {saving ? "Saving..." : "Save Adjustments"}
                  </button>
                </div>
              </form>
            )}

            {/* Transactions Sub-table */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Transaction History
              </h5>
              {record.transactions && record.transactions.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--card-border)" }}>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr style={{ backgroundColor: "var(--background)", borderBottom: "1px solid var(--card-border)" }}>
                        <th className="p-2 font-semibold" style={{ color: "var(--text-secondary)" }}>Receipt</th>
                        <th className="p-2 font-semibold" style={{ color: "var(--text-secondary)" }}>Date</th>
                        <th className="p-2 font-semibold" style={{ color: "var(--text-secondary)" }}>Mode</th>
                        <th className="p-2 font-semibold" style={{ color: "var(--text-secondary)" }}>Ref ID</th>
                        <th className="p-2 font-semibold text-right" style={{ color: "var(--text-secondary)" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {record.transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                          <td className="p-2 font-bold" style={{ color: "var(--accent-primary)" }}>{tx.receipt_number}</td>
                          <td className="p-2" style={{ color: "var(--text-secondary)" }}>
                            {new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="p-2 uppercase" style={{ color: "var(--text-secondary)" }}>{tx.mode.replace("_", " ")}</td>
                          <td className="p-2 font-mono text-[10px]" style={{ color: "var(--text-tertiary)" }}>{tx.transaction_id || "—"}</td>
                          <td className="p-2 font-bold text-right" style={{ color: "var(--text-primary)" }}>
                            ₹{tx.amount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: "var(--text-tertiary)" }}>
                  No payment ledger transactions recorded for this month.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      {record.balance > 0 && (
        <div className="px-5 py-3 border-t flex justify-end" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--background)" }}>
          <button
            onClick={() => onRecordPayment(record)}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer hover:scale-[1.02]"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: "0 2px 6px rgba(99, 102, 241, 0.25)",
            }}
          >
            Record Payment
          </button>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Sub-Components
   ────────────────────────────────────────────── */

function InfoItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <p
        className="text-sm font-bold mt-0.5"
        style={{
          color: highlight ? "var(--accent-danger)" : "var(--text-primary)",
        }}
      >
        {value}
      </p>
    </div>
  );
}
