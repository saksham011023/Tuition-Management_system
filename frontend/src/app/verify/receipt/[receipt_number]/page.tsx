"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token") || localStorage.getItem("token")
      : null;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatMode(mode: string): string {
  return mode.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ReceiptDetails {
  receipt_number: string;
  amount: number;
  date: string;
  mode: string;
  transaction_id?: string | null;
  notes?: string | null;
  student_id: string;
  fee_record_id: string;
}

export default function VerifyReceiptPage() {
  const params = useParams();
  const receiptNumber = params.receipt_number as string;

  const [receipt, setReceipt] = useState<ReceiptDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchReceipt() {
      try {
        const res = await fetch(`${API_BASE}/fees/receipt/${receiptNumber}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setReceipt(data);
        } else if (res.status === 404) {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    if (receiptNumber) fetchReceipt();
  }, [receiptNumber]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)" }}
    >
      <div className="w-full max-w-md">
        {/* TMS Logo/Brand */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
            style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
          >
            🎓
          </div>
          <h1 className="text-2xl font-bold text-white">Receipt Verification</h1>
          <p className="text-sm text-indigo-300 mt-1">Tuition Management System</p>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
          }}
        >
          {loading ? (
            <div className="p-10 text-center">
              <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-indigo-300">Verifying receipt...</p>
            </div>
          ) : notFound || !receipt ? (
            <div className="p-10 text-center">
              <div className="text-5xl mb-4">❌</div>
              <h3 className="text-lg font-bold text-white mb-2">Receipt Not Found</h3>
              <p className="text-sm text-indigo-300">
                No receipt found for <span className="font-mono text-indigo-200">{receiptNumber}</span>
              </p>
              <p className="text-xs text-indigo-400 mt-2">
                This receipt may be invalid, already cancelled, or does not exist in our system.
              </p>
            </div>
          ) : (
            <>
              {/* Verified Header */}
              <div
                className="p-5 text-center"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
              >
                <div className="text-3xl mb-2">✅</div>
                <h2 className="text-lg font-bold text-white">Genuine Receipt Verified</h2>
                <p className="text-sm text-green-100 mt-0.5">
                  This receipt is authentic and recorded in our system.
                </p>
              </div>

              {/* Receipt Details */}
              <div className="p-6 space-y-4">
                <div
                  className="text-center py-3 px-4 rounded-xl"
                  style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-1">
                    Receipt Number
                  </p>
                  <p className="text-xl font-mono font-extrabold text-indigo-200">
                    {receipt.receipt_number}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <VerifyField label="Amount Paid" value={`₹${receipt.amount.toLocaleString("en-IN")}`} highlight />
                  <VerifyField label="Payment Date" value={formatDate(receipt.date)} />
                  <VerifyField label="Payment Mode" value={formatMode(receipt.mode)} />
                  {receipt.transaction_id && (
                    <VerifyField label="Transaction ID" value={receipt.transaction_id} mono />
                  )}
                </div>

                {receipt.notes && (
                  <div
                    className="rounded-xl p-3 text-xs"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}
                  >
                    <span className="font-bold text-white">Notes:</span> {receipt.notes}
                  </div>
                )}

                <div
                  className="rounded-xl p-3 text-center text-xs"
                  style={{
                    background: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    color: "rgba(16,185,129,0.9)",
                  }}
                >
                  🔒 This verification is powered by TMS — Tuition Management System
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-indigo-500 mt-6">
          For queries, contact your tuition centre directly.
        </p>
      </div>
    </div>
  );
}

function VerifyField({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1">{label}</p>
      <p
        className={`text-sm font-bold ${mono ? "font-mono" : ""}`}
        style={{ color: highlight ? "#10b981" : "rgba(255,255,255,0.9)" }}
      >
        {value}
      </p>
    </div>
  );
}
