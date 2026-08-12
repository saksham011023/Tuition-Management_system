"use client";

import React from "react";
import type {
  FeeCollectionReport,
  PendingFeesReport,
  AttendanceReport,
  StudentPerformanceReport,
  BatchReport,
  MonthlySummaryReport,
  ReportType,
} from "./types";

/* ──────────────────────────────────────────────
   Shared helpers
   ────────────────────────────────────────────── */

const currency = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const pct = (n: number) => `${n.toFixed(1)}%`;

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    paid: { bg: "#10B98118", text: "#10B981", label: "Paid" },
    partially_paid: { bg: "#F59E0B18", text: "#F59E0B", label: "Partial" },
    pending: { bg: "#EF444418", text: "#EF4444", label: "Pending" },
  };
  const s = cfg[status] ?? { bg: "#6B728018", text: "#6B7280", label: status };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

function PctBadge({ value, threshold = 75 }: { value: number; threshold?: number }) {
  const good = value >= threshold;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold"
      style={{ color: good ? "#10B981" : "#EF4444" }}
    >
      {good ? "▲" : "▼"} {pct(value)}
    </span>
  );
}

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--card-border)" }}>
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className="px-3 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap"
      style={{
        textAlign: right ? "right" : "left",
        color: "var(--text-secondary)",
        backgroundColor: "var(--bg-secondary, #1e293b)",
        borderBottom: "1px solid var(--card-border)",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, right, mono }: { children: React.ReactNode; right?: boolean; mono?: boolean }) {
  return (
    <td
      className={`px-3 py-2.5 whitespace-nowrap ${mono ? "font-mono text-xs" : "text-sm"}`}
      style={{
        textAlign: right ? "right" : "left",
        color: "var(--text-primary)",
        borderBottom: "1px solid var(--card-border)",
      }}
    >
      {children}
    </td>
  );
}

/* ──────────────────────────────────────────────
   KPI Summary Strip
   ────────────────────────────────────────────── */

interface KpiItem {
  label: string;
  value: string;
  color?: string;
}

function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-4">
      {items.map((k) => (
        <div
          key={k.label}
          className="rounded-lg p-3 border"
          style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
            {k.label}
          </p>
          <p className="text-lg font-bold" style={{ color: k.color ?? "var(--text-primary)" }}>
            {k.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Fee Collection Preview
   ══════════════════════════════════════════════ */

export function FeeCollectionPreview({ data }: { data: FeeCollectionReport }) {
  return (
    <div className="space-y-4">
      <KpiStrip
        items={[
          { label: "Expected", value: currency(data.total_expected), color: "#4F46E5" },
          { label: "Collected", value: currency(data.total_collected), color: "#10B981" },
          { label: "Pending", value: currency(data.total_pending), color: "#EF4444" },
          { label: "Collection Rate", value: pct(data.collection_rate), color: data.collection_rate >= 80 ? "#10B981" : "#F59E0B" },
          { label: "Paid / Partial / Pending", value: `${data.paid_count} / ${data.partially_paid_count} / ${data.pending_count}` },
        ]}
      />

      {/* Mode breakdown */}
      <div className="flex gap-4 flex-wrap">
        {Object.entries(data.by_mode).map(([mode, amt]) => (
          <div key={mode} className="flex items-center gap-2 text-sm">
            <span className="text-xs font-medium capitalize" style={{ color: "var(--text-secondary)" }}>
              {mode.replace("_", " ")}:
            </span>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {currency(amt)}
            </span>
          </div>
        ))}
      </div>

      <TableWrapper>
        <thead>
          <tr>
            <Th>Student</Th>
            <Th>Class</Th>
            <Th>Month</Th>
            <Th right>Net Amount</Th>
            <Th right>Paid</Th>
            <Th right>Balance</Th>
            <Th>Modes</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={`${r.student_id}-${r.month}`} style={{ backgroundColor: i % 2 === 1 ? "var(--bg-secondary, #0f172a10)" : undefined }}>
              <Td>{r.student_name}</Td>
              <Td>{r.class_name}</Td>
              <Td mono>{r.month}</Td>
              <Td right mono>{currency(r.net_amount)}</Td>
              <Td right mono>{currency(r.paid_amount)}</Td>
              <Td right mono>{currency(r.balance)}</Td>
              <Td>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {r.payment_modes.join(", ") || "—"}
                </span>
              </Td>
              <Td><StatusBadge status={r.status} /></Td>
            </tr>
          ))}
        </tbody>
      </TableWrapper>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Pending Fees Preview
   ══════════════════════════════════════════════ */

export function PendingFeesPreview({ data }: { data: PendingFeesReport }) {
  return (
    <div className="space-y-4">
      <KpiStrip
        items={[
          { label: "As of Date", value: data.as_of_date },
          { label: "Total Outstanding", value: currency(data.total_pending_amount), color: "#EF4444" },
          { label: "Records", value: String(data.total_records) },
        ]}
      />
      <TableWrapper>
        <thead>
          <tr>
            <Th>Student</Th>
            <Th>Class</Th>
            <Th>Month</Th>
            <Th right>Net Amount</Th>
            <Th right>Paid</Th>
            <Th right>Balance</Th>
            <Th>Due Date</Th>
            <Th right>Days Overdue</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr
              key={`${r.student_id}-${r.month}`}
              style={{
                backgroundColor: r.days_overdue > 30 ? "#FEF2F2" : (i % 2 === 1 ? "var(--bg-secondary, #0f172a10)" : undefined),
              }}
            >
              <Td>{r.student_name}</Td>
              <Td>{r.class_name}</Td>
              <Td mono>{r.month}</Td>
              <Td right mono>{currency(r.net_amount)}</Td>
              <Td right mono>{currency(r.paid_amount)}</Td>
              <Td right mono><span style={{ color: "#EF4444", fontWeight: 600 }}>{currency(r.balance)}</span></Td>
              <Td mono>{r.due_date}</Td>
              <Td right>
                <span style={{ color: r.days_overdue > 30 ? "#EF4444" : r.days_overdue > 0 ? "#F59E0B" : "#10B981" }}>
                  {r.days_overdue}d
                </span>
              </Td>
              <Td><StatusBadge status={r.status} /></Td>
            </tr>
          ))}
        </tbody>
      </TableWrapper>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Attendance Preview
   ══════════════════════════════════════════════ */

export function AttendancePreview({ data }: { data: AttendanceReport }) {
  return (
    <div className="space-y-4">
      <KpiStrip
        items={[
          { label: "Overall Rate", value: pct(data.overall_rate), color: data.overall_rate >= 75 ? "#10B981" : "#EF4444" },
          { label: "Total Sessions", value: String(data.total_sessions) },
          { label: "Students", value: String(data.student_rows.length) },
        ]}
      />

      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Student-wise</p>
      <TableWrapper>
        <thead>
          <tr>
            <Th>Student</Th>
            <Th>Class</Th>
            <Th>Batch</Th>
            <Th right>Sessions</Th>
            <Th right>Present</Th>
            <Th right>Absent</Th>
            <Th right>Leave</Th>
            <Th right>Rate</Th>
          </tr>
        </thead>
        <tbody>
          {data.student_rows.map((r, i) => (
            <tr key={r.student_id} style={{ backgroundColor: i % 2 === 1 ? "var(--bg-secondary, #0f172a10)" : undefined }}>
              <Td>{r.student_name}</Td>
              <Td>{r.class_name}</Td>
              <Td>{r.batch_name ?? "—"}</Td>
              <Td right>{r.total_sessions}</Td>
              <Td right><span style={{ color: "#10B981" }}>{r.present}</span></Td>
              <Td right><span style={{ color: "#EF4444" }}>{r.absent}</span></Td>
              <Td right><span style={{ color: "#F59E0B" }}>{r.leave}</span></Td>
              <Td right><PctBadge value={r.attendance_percentage} /></Td>
            </tr>
          ))}
        </tbody>
      </TableWrapper>

      {data.daily_rows.length > 0 && (
        <>
          <p className="text-sm font-semibold mt-2" style={{ color: "var(--text-primary)" }}>Daily Summary</p>
          <TableWrapper>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Batch</Th>
                <Th right>Students</Th>
                <Th right>Present</Th>
                <Th right>Absent</Th>
                <Th right>Leave</Th>
                <Th right>Rate</Th>
              </tr>
            </thead>
            <tbody>
              {data.daily_rows.map((r, i) => (
                <tr key={r.date} style={{ backgroundColor: i % 2 === 1 ? "var(--bg-secondary, #0f172a10)" : undefined }}>
                  <Td mono>{r.date}</Td>
                  <Td>{r.batch_name ?? "All"}</Td>
                  <Td right>{r.total_students}</Td>
                  <Td right><span style={{ color: "#10B981" }}>{r.present}</span></Td>
                  <Td right><span style={{ color: "#EF4444" }}>{r.absent}</span></Td>
                  <Td right><span style={{ color: "#F59E0B" }}>{r.leave}</span></Td>
                  <Td right><PctBadge value={r.attendance_rate} /></Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Student Performance Preview
   ══════════════════════════════════════════════ */

export function StudentPerformancePreview({ data }: { data: StudentPerformanceReport }) {
  return (
    <div className="space-y-4">
      <KpiStrip
        items={[
          { label: "Students", value: String(data.rows.length) },
          { label: "Period", value: `${data.start_date} → ${data.end_date}` },
        ]}
      />
      <TableWrapper>
        <thead>
          <tr>
            <Th>Student</Th>
            <Th>Class</Th>
            <Th right>Tests</Th>
            <Th right>Avg Score</Th>
            <Th right>Highest</Th>
            <Th right>Lowest</Th>
            <Th right>Attendance</Th>
            <Th right>Outstanding</Th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={r.student_id} style={{ backgroundColor: i % 2 === 1 ? "var(--bg-secondary, #0f172a10)" : undefined }}>
              <Td>{r.student_name}</Td>
              <Td>{r.class_name}</Td>
              <Td right>{r.total_tests}</Td>
              <Td right><PctBadge value={r.avg_score_percentage} threshold={60} /></Td>
              <Td right><span style={{ color: "#10B981" }}>{pct(r.highest_score_percentage)}</span></Td>
              <Td right><span style={{ color: "#EF4444" }}>{pct(r.lowest_score_percentage)}</span></Td>
              <Td right><PctBadge value={r.attendance_percentage} /></Td>
              <Td right mono>
                <span style={{ color: r.outstanding_balance > 0 ? "#EF4444" : "#10B981" }}>
                  {currency(r.outstanding_balance)}
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrapper>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Batch Preview
   ══════════════════════════════════════════════ */

export function BatchPreview({ data }: { data: BatchReport }) {
  return (
    <div className="space-y-4">
      <KpiStrip
        items={[
          { label: "Batches", value: String(data.rows.length) },
          { label: "Period", value: `${data.start_date} → ${data.end_date}` },
          {
            label: "Total Collected",
            value: currency(data.rows.reduce((s, r) => s + r.total_fee_collected, 0)),
            color: "#10B981",
          },
          {
            label: "Total Pending",
            value: currency(data.rows.reduce((s, r) => s + r.total_fee_pending, 0)),
            color: "#EF4444",
          },
        ]}
      />
      <TableWrapper>
        <thead>
          <tr>
            <Th>Batch</Th>
            <Th>Subject</Th>
            <Th>Teacher</Th>
            <Th>Days</Th>
            <Th>Timing</Th>
            <Th right>Students</Th>
            <Th right>Capacity</Th>
            <Th right>Att. Rate</Th>
            <Th right>Collected</Th>
            <Th right>Pending</Th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={r.batch_id} style={{ backgroundColor: i % 2 === 1 ? "var(--bg-secondary, #0f172a10)" : undefined }}>
              <Td>{r.batch_name}</Td>
              <Td>{r.subject}</Td>
              <Td>{r.teacher}</Td>
              <Td>{r.days.slice(0, 3).join(", ")}</Td>
              <Td>{r.timing}</Td>
              <Td right>{r.total_students}</Td>
              <Td right>{r.max_students}</Td>
              <Td right><PctBadge value={r.attendance_rate} /></Td>
              <Td right mono><span style={{ color: "#10B981" }}>{currency(r.total_fee_collected)}</span></Td>
              <Td right mono><span style={{ color: r.total_fee_pending > 0 ? "#EF4444" : "#10B981" }}>{currency(r.total_fee_pending)}</span></Td>
            </tr>
          ))}
        </tbody>
      </TableWrapper>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Monthly Summary Preview
   ══════════════════════════════════════════════ */

export function MonthlySummaryPreview({ data }: { data: MonthlySummaryReport }) {
  return (
    <div className="space-y-4">
      <KpiStrip
        items={[
          { label: "Months", value: String(data.rows.length) },
          {
            label: "Total Collected",
            value: currency(data.rows.reduce((s, r) => s + r.fees_collected, 0)),
            color: "#10B981",
          },
          {
            label: "Avg Collection Rate",
            value: pct(data.rows.reduce((s, r) => s + r.collection_rate, 0) / Math.max(data.rows.length, 1)),
          },
        ]}
      />
      <TableWrapper>
        <thead>
          <tr>
            <Th>Month</Th>
            <Th right>Students</Th>
            <Th right>Sessions</Th>
            <Th right>Avg Att.</Th>
            <Th right>Expected</Th>
            <Th right>Collected</Th>
            <Th right>Pending</Th>
            <Th right>Coll. Rate</Th>
            <Th right>Tests</Th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={r.month} style={{ backgroundColor: i % 2 === 1 ? "var(--bg-secondary, #0f172a10)" : undefined }}>
              <Td mono>{r.month}</Td>
              <Td right>{r.active_students}</Td>
              <Td right>{r.total_sessions}</Td>
              <Td right><PctBadge value={r.avg_attendance_rate} /></Td>
              <Td right mono>{currency(r.fees_expected)}</Td>
              <Td right mono><span style={{ color: "#10B981" }}>{currency(r.fees_collected)}</span></Td>
              <Td right mono><span style={{ color: r.fees_pending > 0 ? "#EF4444" : "#10B981" }}>{currency(r.fees_pending)}</span></Td>
              <Td right>
                <PctBadge value={r.collection_rate} threshold={80} />
              </Td>
              <Td right>{r.tests_conducted}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrapper>
    </div>
  );
}

/* Td with optional style prop */
function TdStyled({ children, right, mono, style }: {
  children: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <td
      className={`px-3 py-2.5 whitespace-nowrap ${mono ? "font-mono text-xs" : "text-sm"}`}
      style={{
        textAlign: right ? "right" : "left",
        color: "var(--text-primary)",
        borderBottom: "1px solid var(--card-border)",
        ...style,
      }}
    >
      {children}
    </td>
  );
}
