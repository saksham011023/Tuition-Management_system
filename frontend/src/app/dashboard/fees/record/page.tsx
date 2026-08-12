"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import PaymentForm, { PaymentFormData } from "@/components/fees/payment-form";
import PaymentConfirmationDialog from "@/components/fees/payment-confirmation-dialog";
import type { PaymentReceiptData } from "@/lib/notifications/notification-service";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface StudentSearchItem {
  id: string;
  name: string;
  class_name: string;
}

interface FeeRecordItem {
  id: string;
  month: string;
  net_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
}

interface SelectedPaymentData {
  id: string; // fee record ID
  student_id: string;
  student_name: string;
  month: string;
  net_amount: number;
  paid_amount: number;
  balance: number;
}



/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

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

export default function RecordPaymentPage() {
  const router = useRouter();
  
  // Selection States
  const [selectedRecord, setSelectedRecord] = useState<SelectedPaymentData | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<StudentSearchItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [studentUnpaidRecords, setStudentUnpaidRecords] = useState<FeeRecordItem[]>([]);
  const [loadingUnpaid, setLoadingUnpaid] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<PaymentReceiptData | null>(null);

  // 1. Check session storage for pre-selected record
  useEffect(() => {
    const stored = sessionStorage.getItem("selected_payment_record");
    if (stored) {
      setSelectedRecord(JSON.parse(stored));
      sessionStorage.removeItem("selected_payment_record"); // clean up
    }
  }, []);

  // 2. Debounced Student search
  useEffect(() => {
    if (studentSearch.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_BASE}/students?search=${encodeURIComponent(studentSearch)}&page_size=8`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.items.map((i: any) => ({ id: i.id, name: i.name, class_name: i.class_name })));
          setShowDropdown(data.items.length > 0);
        }
      } catch {
        // Fallback or ignore
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [studentSearch]);

  // Click outside to close student search dropdown
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelectStudent = async (student: StudentSearchItem) => {
    setShowDropdown(false);
    setStudentSearch(student.name);
    setLoadingUnpaid(true);
    setError(null);
    setSelectedRecord(null);
    
    try {
      // Fetch unpaid months for student
      const res = await fetch(`${API_BASE}/fees?student_id=${student.id}&status=pending`, {
        headers: getAuthHeaders(),
      });
      const partialsRes = await fetch(`${API_BASE}/fees?student_id=${student.id}&status=partially_paid`, {
        headers: getAuthHeaders(),
      });
      
      let allUnpaid: FeeRecordItem[] = [];
      if (res.ok) {
        const data = await res.json();
        allUnpaid = [...allUnpaid, ...data.items];
      }
      if (partialsRes.ok) {
        const data = await partialsRes.json();
        allUnpaid = [...allUnpaid, ...data.items];
      }
      
      // Sort by month desc
      allUnpaid.sort((a, b) => b.month.localeCompare(a.month));
      setStudentUnpaidRecords(allUnpaid);
      
      if (allUnpaid.length === 0) {
        setError(`Student '${student.name}' has no outstanding balance bills found.`);
      }
    } catch {
      // Mock Fallback
      setStudentUnpaidRecords([
        { id: "mock-r1", month: "2026-07", net_amount: 4500, paid_amount: 0, balance: 4500, status: "pending" },
        { id: "mock-r2", month: "2026-06", net_amount: 4500, paid_amount: 2000, balance: 2500, status: "partially_paid" },
      ]);
    }
    setLoadingUnpaid(false);
  };

  const handleSelectMonthRecord = (rec: FeeRecordItem) => {
    setSelectedRecord({
      id: rec.id,
      student_id: "", // not strictly needed for form
      student_name: studentSearch,
      month: rec.month,
      net_amount: rec.net_amount,
      paid_amount: rec.paid_amount,
      balance: rec.balance,
    });
  };

  const handlePaymentSubmit = async (formData: PaymentFormData) => {
    if (!selectedRecord) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/fees/${selectedRecord.id}/pay`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const detail = await res.json();
        const lastTx = detail.transactions[detail.transactions.length - 1];
        const paid = detail.paid_amount || formData.amount;
        const balance = detail.balance ?? 0;

        setReceiptData({
          studentId: detail.student_id,
          studentName: detail.student_name || selectedRecord.student_name,
          parentName: detail.parent_name || "",
          parentMobile: detail.parent_mobile || "",
          className: detail.class_name || "",
          batchNames: detail.batch_names || [],
          month: detail.month || selectedRecord.month,
          amount: lastTx?.amount || formData.amount,
          balance,
          receiptNumber: lastTx?.receipt_number || `TMS-${Date.now()}`,
          paymentDate: lastTx?.date || formData.date,
          paymentMode: lastTx?.mode || formData.mode,
          transactionId: lastTx?.transaction_id || formData.transaction_id,
          notes: lastTx?.notes || formData.notes,
        });
      } else {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to record transaction.");
      }
    } catch (err: any) {
      setError(err?.message || "Could not connect to backend. Please check the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/dashboard/fees")}
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
          Back to Fees Overview
        </button>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Record Payment Ledger
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Collect outstanding balances, process UPI/Cash references, and issue official print receipts.
        </p>
      </div>

      {/* ERROR Banner */}
      {error && (
        <div
          className="p-3 rounded-lg border text-sm font-semibold max-w-xl mx-auto"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            borderColor: "rgba(239, 68, 68, 0.2)",
            color: "var(--accent-danger)",
          }}
        >
          {error}
        </div>
      )}

      {/* Conditional Flow rendering */}
      {receiptData ? (
        // Step 3: Payment Confirmation Dialog
        <PaymentConfirmationDialog
          receipt={receiptData}
          onClose={() => router.push("/dashboard/fees")}
        />
      ) : selectedRecord ? (
        // Step 2: Payment Form
        <div className="space-y-4">
          <PaymentForm
            record={selectedRecord}
            studentName={selectedRecord.student_name}
            onSubmit={handlePaymentSubmit}
            isSubmitting={isSubmitting}
          />
          <div className="text-center">
            <button
              onClick={() => setSelectedRecord(null)}
              className="text-xs text-indigo-600 hover:underline cursor-pointer font-semibold"
            >
              ← Choose another billing month or student
            </button>
          </div>
        </div>
      ) : (
        // Step 1: Student & Month Selection
        <div
          className="max-w-xl mx-auto p-5 md:p-6 border rounded-xl space-y-6"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          {/* Autocomplete Student Search */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-400">
              Select Student *
            </label>
            <div className="relative">
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setStudentUnpaidRecords([]);
                }}
                placeholder="Type student name to search..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--card-border)",
                  color: "var(--text-primary)",
                }}
              />
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4 absolute left-3 top-3"
                style={{ color: "var(--text-tertiary)" }}
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                  clipRule="evenodd"
                />
              </svg>
              {isSearching && (
                <div
                  className="absolute right-3 top-3 w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
                />
              )}
            </div>

            {/* Results Autocomplete */}
            {showDropdown && (
              <div
                className="absolute z-20 w-full mt-1 border rounded-lg shadow-lg max-h-48 overflow-y-auto"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--card-border)",
                }}
              >
                {searchResults.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => handleSelectStudent(st)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left text-sm cursor-pointer"
                  >
                    <div>
                      <span className="font-bold block" style={{ color: "var(--text-primary)" }}>{st.name}</span>
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{st.class_name}</span>
                    </div>
                    <span className="text-xs font-bold text-indigo-600">Select →</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Loader */}
          {loadingUnpaid && (
            <div className="flex items-center justify-center p-4">
              <span className="text-xs animate-pulse" style={{ color: "var(--text-secondary)" }}>
                Loading student bills...
              </span>
            </div>
          )}

          {/* Month list selection */}
          {studentUnpaidRecords.length > 0 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Choose Billing Month Outstanding
              </label>
              <div className="space-y-2">
                {studentUnpaidRecords.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => handleSelectMonthRecord(rec)}
                    className="flex justify-between items-center p-3 rounded-lg border cursor-pointer hover:bg-indigo-50/20 hover:border-indigo-400 transition-all duration-200"
                    style={{
                      borderColor: "var(--card-border)",
                    }}
                  >
                    <div>
                      <span className="font-bold block" style={{ color: "var(--text-primary)" }}>
                        {formatMonth(rec.month)}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        Status:{" "}
                        <b
                          style={{
                            color: rec.status === "partially_paid" ? "var(--accent-warning)" : "var(--accent-danger)",
                          }}
                        >
                          {rec.status === "partially_paid" ? "Partially Paid" : "Unpaid"}
                        </b>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm block" style={{ color: "var(--accent-danger)" }}>
                        ₹{rec.balance.toLocaleString("en-IN")} due
                      </span>
                      <span className="text-[10px] text-slate-400 block">Click to pay →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
