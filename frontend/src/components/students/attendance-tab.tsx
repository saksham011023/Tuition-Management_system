"use client";

import React, { useState } from "react";

interface AttendanceRecord {
  id: string;
  date: string;
  status: string; // present, absent, late
  remarks?: string | null;
}

interface AttendanceTabProps {
  studentId: string;
  records: AttendanceRecord[];
  onRecordAdded: (record: AttendanceRecord) => void;
}

export default function AttendanceTab({
  studentId,
  records: initialRecords,
  onRecordAdded,
}: AttendanceTabProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [showAddForm, setShowAddForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("present");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stats calculation
  const totalClasses = records.length;
  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const attendanceRate = totalClasses
    ? Math.round(((presentCount + lateCount) / totalClasses) * 100)
    : 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      date,
      status,
      remarks: remarks || null,
    };

    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/students/${studentId}/attendance`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("access_token") || localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newRecord = await res.json();
        setRecords((prev) => [newRecord, ...prev]);
        onRecordAdded(newRecord);
        setShowAddForm(false);
        setRemarks("");
      } else {
        throw new Error();
      }
    } catch (err) {
      // Mock/Offline fallback
      const mockRecord: AttendanceRecord = {
        id: `mock-att-${Date.now()}`,
        date,
        status,
        remarks: remarks || "Logged offline",
      };
      setRecords((prev) => [mockRecord, ...prev]);
      onRecordAdded(mockRecord);
      setShowAddForm(false);
      setRemarks("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Total Sessions</p>
          <p className="text-xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{totalClasses}</p>
        </div>
        <div className="p-4 rounded-xl border" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Present / Late</p>
          <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {presentCount} <span className="text-xs text-amber-500 font-semibold">(+{lateCount} late)</span>
          </p>
        </div>
        <div className="p-4 rounded-xl border" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Absent</p>
          <p className="text-xl font-bold mt-1 text-red-600 dark:text-red-400">{absentCount}</p>
        </div>
        <div className="p-4 rounded-xl border" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Attendance Rate</p>
          <p className="text-xl font-bold mt-1" style={{ color: "var(--accent-primary)" }}>{attendanceRate}%</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Attendance Log
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer"
          style={{ background: "var(--gradient-primary)" }}
        >
          {showAddForm ? "Close Form" : "Log Attendance"}
        </button>
      </div>

      {/* Log Attendance Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="p-5 rounded-lg border space-y-4 animate-fade-in"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
          }}
        >
          <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            New Attendance Entry
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                Session Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--card-border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--card-border)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                Remarks / Notes
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Arrived 10m late"
                className="w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--card-border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 border rounded-lg text-xs font-medium cursor-pointer"
              style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
              style={{ background: "var(--gradient-success)" }}
            >
              {isSubmitting ? "Logging..." : "Log Entry"}
            </button>
          </div>
        </form>
      )}

      {/* Attendance Log Table */}
      <div
        className="overflow-x-auto rounded-lg border"
        style={{ borderColor: "var(--card-border)" }}
      >
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr
              style={{
                backgroundColor: "var(--card-bg)",
                borderBottom: "1px solid var(--card-border)",
              }}
            >
              <th className="p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Date</th>
              <th className="p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Status</th>
              <th className="p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {records.length > 0 ? (
              records.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3 font-medium" style={{ color: "var(--text-primary)" }}>
                    {new Date(rec.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        rec.status === "present"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          : rec.status === "late"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                          : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {rec.remarks || "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-6 text-center italic" style={{ color: "var(--text-tertiary)" }}>
                  No attendance entries recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
