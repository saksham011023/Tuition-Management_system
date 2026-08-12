"use client";

import React from "react";
import Link from "next/link";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface PendingFee {
  id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  month: string;
  net_amount: number;
  paid_amount: number;
  balance: number;
  due_date: string;
  days_overdue: number;
}

interface PendingFeesTableProps {
  items: PendingFee[];
  onRecordPayment: (item: PendingFee) => void;
}

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function formatMonth(monthStr: string): string {
  try {
    const [year, month] = monthStr.split("-");
    const dateObj = new Date(Number(year), Number(month) - 1, 1);
    return dateObj.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  } catch {
    return monthStr;
  }
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function PendingFeesTable({ items, onRecordPayment }: PendingFeesTableProps) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--card-bg)", borderBottom: "1px solid var(--card-border)" }}>
              <th className="p-4 font-semibold" style={{ color: "var(--text-secondary)" }}>Student Name</th>
              <th className="p-4 font-semibold" style={{ color: "var(--text-secondary)" }}>Class</th>
              <th className="p-4 font-semibold" style={{ color: "var(--text-secondary)" }}>Month</th>
              <th className="p-4 font-semibold" style={{ color: "var(--text-secondary)" }}>Net Due</th>
              <th className="p-4 font-semibold" style={{ color: "var(--text-secondary)" }}>Paid</th>
              <th className="p-4 font-semibold" style={{ color: "var(--text-secondary)" }}>Balance</th>
              <th className="p-4 font-semibold" style={{ color: "var(--text-secondary)" }}>Days Overdue</th>
              <th className="p-4 font-semibold text-right" style={{ color: "var(--text-secondary)" }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                  <td className="p-4">
                    <Link
                      href={`/dashboard/fees/student/${item.student_id}`}
                      className="font-bold hover:underline"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      {item.student_name}
                    </Link>
                  </td>
                  <td className="p-4" style={{ color: "var(--text-secondary)" }}>{item.class_name}</td>
                  <td className="p-4">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {formatMonth(item.month)}
                    </span>
                  </td>
                  <td className="p-4 font-semibold" style={{ color: "var(--text-primary)" }}>
                    ₹{item.net_amount.toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 font-semibold" style={{ color: "var(--accent-success)" }}>
                    ₹{item.paid_amount.toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 font-bold" style={{ color: "var(--accent-danger)" }}>
                    ₹{item.balance.toLocaleString("en-IN")}
                  </td>
                  <td className="p-4">
                    {item.days_overdue > 0 ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
                        {item.days_overdue} days late
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Not due yet
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <Link
                      href={`/dashboard/fees/student/${item.student_id}`}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded border hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
                    >
                      Timeline
                    </Link>
                    <button
                      onClick={() => onRecordPayment(item)}
                      className="text-xs font-bold px-2.5 py-1.5 rounded text-white cursor-pointer"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      Pay
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-8 text-center italic" style={{ color: "var(--text-tertiary)" }}>
                  No outstanding pending or partially paid fee obligations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
