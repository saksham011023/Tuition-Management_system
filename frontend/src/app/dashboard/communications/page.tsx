"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MESSAGE_TEMPLATES, renderTemplate } from "@/lib/notifications/message-templates";
import {
  generateFeeReminderMessage,
  openWhatsApp,
  copyToClipboard,
  logNotification,
  formatMonth,
} from "@/lib/notifications/notification-service";
import { getApiBaseUrl } from "@/lib/api/client";

const API_BASE = getApiBaseUrl();

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface Notification {
  id: string;
  student_name: string;
  parent_name: string;
  parent_mobile: string;
  notification_type: string;
  channel: string;
  status: string;
  receipt_number: string | null;
  message: string;
  created_at: string;
}

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

interface Analytics {
  total_receipts_generated: number;
  whatsapp_shares_initiated: number;
  sms_sent: number;
  email_sent: number;
  today_notifications: number;
}

const TAB_LABELS = [
  { key: "history", label: "History", icon: "🕐" },
  { key: "reminders", label: "Reminders", icon: "📅" },
  { key: "bulk", label: "Bulk Message", icon: "📢" },
  { key: "templates", label: "Templates", icon: "📋" },
];

const TYPE_LABELS: Record<string, string> = {
  payment_receipt: "Receipt",
  fee_reminder: "Fee Reminder",
  holiday: "Holiday",
  exam: "Exam",
  attendance: "Attendance",
  performance: "Performance",
  custom: "Custom",
};

const TYPE_COLORS: Record<string, string> = {
  payment_receipt: "rgba(99,102,241,0.15)",
  fee_reminder: "rgba(245,158,11,0.15)",
  holiday: "rgba(16,185,129,0.15)",
  exam: "rgba(59,130,246,0.15)",
  attendance: "rgba(239,68,68,0.15)",
  custom: "rgba(139,92,246,0.15)",
};

/* ──────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────── */

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState("history");
  const [analytics, setAnalytics] = useState<Analytics>({
    total_receipts_generated: 0,
    whatsapp_shares_initiated: 0,
    sms_sent: 0,
    email_sent: 0,
    today_notifications: 0,
  });

  // History state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notiLoading, setNotiLoading] = useState(false);
  const [notiSearch, setNotiSearch] = useState("");
  const [notiType, setNotiType] = useState("");
  const [notiPage, setNotiPage] = useState(1);
  const [notiTotal, setNotiTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reminders state
  const [pendingFees, setPendingFees] = useState<PendingFee[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [reminderSearch, setReminderSearch] = useState("");
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set());

  // Bulk message state
  const [bulkTemplate, setBulkTemplate] = useState("payment_received");
  const [customMessage, setCustomMessage] = useState("");
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkStudents, setBulkStudents] = useState<PendingFee[]>([]);
  const [selectedBulk, setSelectedBulk] = useState<Set<string>>(new Set());
  const [bulkCopied, setBulkCopied] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications/analytics`, { headers: getAuthHeaders() });
      if (res.ok) setAnalytics(await res.json());
    } catch {}
  };

  const fetchNotifications = useCallback(async () => {
    setNotiLoading(true);
    try {
      const q = new URLSearchParams({ page: String(notiPage), page_size: "15" });
      if (notiSearch) q.append("search", notiSearch);
      if (notiType) q.append("notification_type", notiType);
      const res = await fetch(`${API_BASE}/notifications?${q}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items);
        setNotiTotal(data.total);
      }
    } catch {}
    setNotiLoading(false);
  }, [notiPage, notiSearch, notiType]);

  const fetchPendingFees = useCallback(async () => {
    setPendingLoading(true);
    try {
      const q = new URLSearchParams();
      if (reminderSearch) q.append("search", reminderSearch);
      const res = await fetch(`${API_BASE}/fees/pending?${q}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPendingFees(data);
        setBulkStudents(data);
      }
    } catch {}
    setPendingLoading(false);
  }, [reminderSearch]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (activeTab === "history") fetchNotifications();
  }, [activeTab, fetchNotifications]);

  useEffect(() => {
    if (activeTab === "reminders" || activeTab === "bulk") fetchPendingFees();
  }, [activeTab, fetchPendingFees]);

  const handleSendReminder = async (fee: PendingFee, reminderType: "upcoming" | "overdue") => {
    const message = generateFeeReminderMessage({
      studentId: fee.student_id,
      studentName: fee.student_name,
      parentName: "Parent",
      parentMobile: "",
      amount: fee.balance,
      month: fee.month,
      dueDate: fee.due_date,
      daysOverdue: reminderType === "overdue" ? fee.days_overdue : 0,
    });
    // We don't have parent mobile in PendingFeeItem — show copy fallback
    await copyToClipboard(message);
    setSentReminders((prev) => new Set([...prev, fee.id + reminderType]));
    setTimeout(() => setSentReminders((prev) => { const n = new Set(prev); n.delete(fee.id + reminderType); return n; }), 4000);
  };

  const handleBulkWhatsApp = async (fee: PendingFee) => {
    const selectedTpl = MESSAGE_TEMPLATES.find((t) => t.key === bulkTemplate);
    const message = selectedTpl
      ? renderTemplate(selectedTpl.template, {
          parent_name: "Parent",
          student_name: fee.student_name,
          amount: fee.balance.toLocaleString("en-IN"),
          month: formatMonth(fee.month),
          due_date: fee.due_date,
          days_overdue: String(fee.days_overdue),
          institute_name: "Tuition Centre",
          message: customMessage || "Please contact the tuition centre.",
          receipt_number: "—",
          balance: `₹${fee.balance.toLocaleString("en-IN")}`,
        })
      : customMessage;
    await copyToClipboard(message);
    setBulkCopied(fee.id);
    setTimeout(() => setBulkCopied(null), 3000);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Communications
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Manage parent notifications, fee reminders, bulk messaging, and message templates.
        </p>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Receipts Generated", value: analytics.total_receipts_generated, color: "#6366f1", icon: "🧾" },
          { label: "WhatsApp Shares", value: analytics.whatsapp_shares_initiated, color: "#25d366", icon: "💬" },
          { label: "Today's Messages", value: analytics.today_notifications, color: "#f59e0b", icon: "📤" },
          { label: "SMS Sent", value: analytics.sms_sent, color: "#3b82f6", icon: "📱" },
          { label: "Emails Sent", value: analytics.email_sent, color: "#8b5cf6", icon: "✉️" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4 border"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--card-border)",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-xl font-extrabold" style={{ color: stat.color }}>
              {stat.value.toLocaleString("en-IN")}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)" }}
      >
        {/* Tab Bar */}
        <div className="flex border-b" style={{ borderColor: "var(--card-border)" }}>
          {TAB_LABELS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-3 text-sm font-semibold transition-colors cursor-pointer"
              style={{
                borderBottom: activeTab === tab.key ? "2px solid var(--accent-primary)" : "2px solid transparent",
                color: activeTab === tab.key ? "var(--accent-primary)" : "var(--text-tertiary)",
                backgroundColor: activeTab === tab.key ? "rgba(99,102,241,0.05)" : "transparent",
              }}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5">

          {/* ── HISTORY TAB ── */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Search by student or parent..."
                  value={notiSearch}
                  onChange={(e) => { setNotiSearch(e.target.value); setNotiPage(1); }}
                  className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg text-sm focus:outline-none"
                  style={{ backgroundColor: "var(--background)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                />
                <select
                  value={notiType}
                  onChange={(e) => { setNotiType(e.target.value); setNotiPage(1); }}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none cursor-pointer"
                  style={{ backgroundColor: "var(--background)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                >
                  <option value="">All Types</option>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {notiLoading ? (
                <div className="text-center py-12 text-sm animate-pulse" style={{ color: "var(--text-secondary)" }}>
                  Loading notification history...
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                    No notifications found
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                    Notifications will appear here once you record payments or send reminders.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-xl border p-4 cursor-pointer hover:border-indigo-400 transition-all"
                      style={{ borderColor: "var(--card-border)", backgroundColor: "var(--background)" }}
                      onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{
                              backgroundColor: TYPE_COLORS[n.notification_type] || "rgba(99,102,241,0.15)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {TYPE_LABELS[n.notification_type] || n.notification_type}
                          </span>
                          <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                            {n.student_name}
                          </span>
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            → {n.parent_name} ({n.parent_mobile})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {n.receipt_number && (
                            <span className="text-[10px] font-mono text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded">
                              {n.receipt_number}
                            </span>
                          )}
                          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                            {new Date(n.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${n.channel === "whatsapp" ? "bg-green-500" : "bg-blue-500"}`}
                            title={`Channel: ${n.channel}`}
                          />
                        </div>
                      </div>
                      {expandedId === n.id && (
                        <div
                          className="mt-3 pt-3 text-xs whitespace-pre-wrap rounded-lg p-3"
                          style={{ borderTop: "1px solid var(--card-border)", backgroundColor: "var(--card-bg)", color: "var(--text-secondary)" }}
                        >
                          {n.message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {notiTotal > 15 && (
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => setNotiPage((p) => Math.max(1, p - 1))}
                    disabled={notiPage === 1}
                    className="px-3 py-1.5 border rounded text-xs font-semibold cursor-pointer disabled:opacity-40"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  >
                    ← Prev
                  </button>
                  <span className="px-3 py-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Page {notiPage}
                  </span>
                  <button
                    onClick={() => setNotiPage((p) => p + 1)}
                    disabled={notiPage * 15 >= notiTotal}
                    className="px-3 py-1.5 border rounded text-xs font-semibold cursor-pointer disabled:opacity-40"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── REMINDERS TAB ── */}
          {activeTab === "reminders" && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Search student..."
                  value={reminderSearch}
                  onChange={(e) => setReminderSearch(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none"
                  style={{ backgroundColor: "var(--background)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                />
              </div>

              <div
                className="p-3 rounded-lg text-xs border"
                style={{ backgroundColor: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.2)", color: "var(--text-secondary)" }}
              >
                💡 <b>How it works:</b> Click any reminder button to copy the message. Then open WhatsApp manually and paste it.
                Parent phone numbers are fetched from the student profile via the student detail page.
              </div>

              {pendingLoading ? (
                <div className="text-center py-10 text-sm animate-pulse" style={{ color: "var(--text-secondary)" }}>
                  Loading pending fees...
                </div>
              ) : pendingFees.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                    No pending fees found!
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                    All students are up to date.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingFees.map((fee) => (
                    <div
                      key={fee.id}
                      className="flex items-center justify-between p-4 rounded-xl border gap-4"
                      style={{ borderColor: "var(--card-border)", backgroundColor: "var(--background)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                          {fee.student_name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {fee.class_name} • {formatMonth(fee.month)} •{" "}
                          <span style={{ color: "var(--accent-danger)" }}>
                            ₹{fee.balance.toLocaleString("en-IN")} due
                          </span>
                          {fee.days_overdue > 0 && (
                            <span className="ml-1 text-red-500 font-bold">
                              ({fee.days_overdue} days overdue)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {fee.days_overdue > 0 ? (
                          <button
                            onClick={() => handleSendReminder(fee, "overdue")}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer hover:scale-[1.02] transition-all"
                            style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
                          >
                            {sentReminders.has(fee.id + "overdue") ? "✓ Copied!" : "⚠️ Overdue Reminder"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSendReminder(fee, "upcoming")}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer hover:scale-[1.02] transition-all"
                            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                          >
                            {sentReminders.has(fee.id + "upcoming") ? "✓ Copied!" : "📅 Send Reminder"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── BULK MESSAGE TAB ── */}
          {activeTab === "bulk" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-400">
                    Message Template
                  </label>
                  <select
                    value={bulkTemplate}
                    onChange={(e) => setBulkTemplate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none cursor-pointer"
                    style={{ backgroundColor: "var(--background)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  >
                    {MESSAGE_TEMPLATES.map((t) => (
                      <option key={t.key} value={t.key}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-400">
                    Search / Filter Students
                  </label>
                  <input
                    type="text"
                    placeholder="Search student name..."
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                    style={{ backgroundColor: "var(--background)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>

              {bulkTemplate === "custom_message" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-400">
                    Custom Message Body
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={3}
                    placeholder="Type your custom message here..."
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none resize-none"
                    style={{ backgroundColor: "var(--background)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  />
                </div>
              )}

              <div
                className="p-3 rounded-lg text-xs border"
                style={{ backgroundColor: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.2)", color: "var(--text-secondary)" }}
              >
                💡 <b>How it works:</b> Click &quot;Copy Message&quot; for each student, then open WhatsApp and paste the message.
                Showing students with outstanding balances.
              </div>

              <div className="space-y-2">
                {bulkStudents
                  .filter((s) => !bulkSearch || s.student_name.toLowerCase().includes(bulkSearch.toLowerCase()))
                  .map((fee) => (
                    <div
                      key={fee.id}
                      className="flex items-center justify-between p-3 rounded-xl border gap-3"
                      style={{ borderColor: "var(--card-border)", backgroundColor: "var(--background)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                          {fee.student_name}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {fee.class_name} • ₹{fee.balance.toLocaleString("en-IN")} due
                        </p>
                      </div>
                      <button
                        onClick={() => handleBulkWhatsApp(fee)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:scale-[1.02] transition-all"
                        style={{
                          backgroundColor: bulkCopied === fee.id ? "rgba(16,185,129,0.1)" : "rgba(99,102,241,0.1)",
                          color: bulkCopied === fee.id ? "var(--accent-success)" : "var(--accent-primary)",
                          border: "1px solid",
                          borderColor: bulkCopied === fee.id ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)",
                        }}
                      >
                        {bulkCopied === fee.id ? "✓ Copied!" : "📋 Copy Message"}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── TEMPLATES TAB ── */}
          {activeTab === "templates" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MESSAGE_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.key}
                  className="rounded-xl border p-4 space-y-2"
                  style={{ borderColor: "var(--card-border)", backgroundColor: "var(--background)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                      {tpl.name}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: TYPE_COLORS[tpl.type] || "rgba(99,102,241,0.15)", color: "var(--text-primary)" }}
                    >
                      {tpl.type.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-xs font-mono whitespace-pre-wrap rounded-lg p-3"
                    style={{ backgroundColor: "var(--card-bg)", color: "var(--text-secondary)" }}
                  >
                    {tpl.template}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Variables:</span>
                    {tpl.variables.map((v) => (
                      <span
                        key={v}
                        className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                        style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "var(--accent-primary)" }}
                      >
                        {"{" + v + "}"}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
