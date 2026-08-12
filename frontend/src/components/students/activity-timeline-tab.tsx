"use client";

import React, { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface TimelineEvent {
  id: string;
  type: "join" | "fee_generated" | "fee_paid" | "fee_overdue" | "attendance" | "test" | "notification";
  date: string;
  title: string;
  subtitle?: string;
  amount?: number;
  receiptNumber?: string;
  status?: string;
  icon: string;
  color: string;
}

interface Props {
  studentId: string;
  joiningDate?: string;
  studentName?: string;
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function ActivityTimelineTab({ studentId, joiningDate, studentName }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function loadTimeline() {
      setLoading(true);
      const timeline: TimelineEvent[] = [];

      try {
        // 1. Joining event
        if (joiningDate) {
          timeline.push({
            id: "join",
            type: "join",
            date: joiningDate,
            title: "Enrolled at Tuition Centre",
            subtitle: `${studentName || "Student"} joined`,
            icon: "🎓",
            color: "#6366f1",
          });
        }

        // 2. Fee records (timeline)
        const feeRes = await fetch(
          `${API_BASE}/fees/student/${studentId}/timeline`,
          { headers: getAuthHeaders() }
        );
        if (feeRes.ok) {
          const feeData = await feeRes.json();
          for (const record of feeData.records || []) {
            // Fee generated event
            timeline.push({
              id: `fee-gen-${record.id}`,
              type: "fee_generated",
              date: `${record.year}-${String(record.month_num).padStart(2, "0")}-01`,
              title: `Fee Generated — ${formatMonth(record.month)}`,
              subtitle: `₹${record.net_amount.toLocaleString("en-IN")} billed`,
              amount: record.net_amount,
              status: record.status,
              icon: "📋",
              color: "#f59e0b",
            });

            // Payment transactions
            for (const tx of record.transactions || []) {
              timeline.push({
                id: `tx-${tx.id}`,
                type: "fee_paid",
                date: tx.date,
                title: `Payment Received — ${formatMonth(record.month)}`,
                subtitle: `via ${tx.mode.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}`,
                amount: tx.amount,
                receiptNumber: tx.receipt_number,
                icon: "✅",
                color: "#10b981",
              });
            }

            // Overdue event
            if (record.status !== "paid" && record.balance > 0) {
              const dueDate = new Date(record.due_date);
              const today = new Date();
              if (dueDate < today) {
                timeline.push({
                  id: `overdue-${record.id}`,
                  type: "fee_overdue",
                  date: record.due_date,
                  title: `Fee Overdue — ${formatMonth(record.month)}`,
                  subtitle: `₹${record.balance.toLocaleString("en-IN")} still pending`,
                  amount: record.balance,
                  icon: "⚠️",
                  color: "#ef4444",
                });
              }
            }
          }
        }

        // 3. Attendance records
        const attRes = await fetch(
          `${API_BASE}/attendance?student_id=${studentId}&page_size=20`,
          { headers: getAuthHeaders() }
        );
        if (attRes.ok) {
          const attData = await attRes.json();
          for (const rec of (attData.items || attData).slice(0, 10)) {
            timeline.push({
              id: `att-${rec.id}`,
              type: "attendance",
              date: rec.date,
              title: `Attendance — ${capitalize(rec.status)}`,
              subtitle: rec.remarks || undefined,
              status: rec.status,
              icon: rec.status === "present" ? "📗" : rec.status === "absent" ? "📕" : "📙",
              color: rec.status === "present" ? "#10b981" : rec.status === "absent" ? "#ef4444" : "#f59e0b",
            });
          }
        }

        // 4. Test scores
        const testRes = await fetch(
          `${API_BASE}/students/${studentId}/test-scores`,
          { headers: getAuthHeaders() }
        );
        if (testRes.ok) {
          const testData = await testRes.json();
          for (const score of (testData.items || testData || []).slice(0, 10)) {
            timeline.push({
              id: `test-${score.id}`,
              type: "test",
              date: score.date,
              title: `Test: ${score.test_name}`,
              subtitle: `${score.marks_obtained}/${score.max_marks} marks (${Math.round((score.marks_obtained / score.max_marks) * 100)}%)`,
              icon: "📝",
              color: "#8b5cf6",
            });
          }
        }

        // 5. Notification history for this student
        const notiRes = await fetch(
          `${API_BASE}/notifications?student_id=${studentId}&page_size=10`,
          { headers: getAuthHeaders() }
        );
        if (notiRes.ok) {
          const notiData = await notiRes.json();
          for (const n of (notiData.items || []).slice(0, 5)) {
            timeline.push({
              id: `noti-${n.id}`,
              type: "notification",
              date: n.created_at.split("T")[0],
              title: `${n.notification_type === "payment_receipt" ? "Receipt Shared" : "Notification Sent"} via ${capitalize(n.channel)}`,
              subtitle: n.receipt_number ? `Receipt: ${n.receipt_number}` : undefined,
              receiptNumber: n.receipt_number || undefined,
              icon: n.channel === "whatsapp" ? "💬" : "📧",
              color: "#25d366",
            });
          }
        }
      } catch {
        // Graceful fallback
      }

      // Sort by date descending
      timeline.sort((a, b) => b.date.localeCompare(a.date));
      setEvents(timeline);
      setLoading(false);
    }

    if (studentId) loadTimeline();
  }, [studentId, joiningDate, studentName]);

  const filteredEvents = filter === "all" ? events : events.filter((e) => e.type === filter);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All Events" },
          { key: "fee_paid", label: "Payments" },
          { key: "fee_generated", label: "Billings" },
          { key: "attendance", label: "Attendance" },
          { key: "test", label: "Tests" },
          { key: "notification", label: "Notifications" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer"
            style={{
              backgroundColor: filter === f.key ? "var(--accent-primary)" : "var(--background)",
              color: filter === f.key ? "white" : "var(--text-secondary)",
              border: filter === f.key ? "1px solid transparent" : "1px solid var(--card-border)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm animate-pulse" style={{ color: "var(--text-secondary)" }}>
          Building activity timeline...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-3xl mb-3">📭</div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No events to show for this filter.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div
            className="absolute left-[19px] top-0 bottom-0 w-0.5"
            style={{ backgroundColor: "var(--card-border)" }}
          />

          <div className="space-y-4">
            {filteredEvents.map((event, idx) => (
              <div key={event.id} className="flex items-start gap-4 relative">
                {/* Icon node */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-base relative z-10 border-2"
                  style={{
                    backgroundColor: `${event.color}15`,
                    borderColor: `${event.color}40`,
                  }}
                >
                  {event.icon}
                </div>

                {/* Content */}
                <div
                  className="flex-1 min-w-0 rounded-xl border p-3"
                  style={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--card-border)",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                        {event.title}
                      </p>
                      {event.subtitle && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                          {event.subtitle}
                        </p>
                      )}
                      {event.receiptNumber && (
                        <span
                          className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "var(--accent-primary)" }}
                        >
                          {event.receiptNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {event.amount !== undefined && (
                        <p
                          className="text-sm font-extrabold"
                          style={{ color: event.type === "fee_overdue" ? "var(--accent-danger)" : "var(--accent-success)" }}
                        >
                          {event.type === "fee_overdue" ? "-" : event.type === "fee_generated" ? "" : "+"}
                          ₹{event.amount.toLocaleString("en-IN")}
                        </p>
                      )}
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {new Date(event.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatMonth(monthStr: string): string {
  try {
    const [year, month] = monthStr.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  } catch {
    return monthStr;
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
