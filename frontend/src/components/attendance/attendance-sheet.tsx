"use client";

import React from "react";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

export interface AttendanceRecord {
  student_id: string;
  student_name: string;
  class_name?: string;
  status: "present" | "absent" | "leave";
  remarks: string | null;
}

interface AttendanceSheetProps {
  records: AttendanceRecord[];
  onChange: (studentId: string, field: "status" | "remarks", value: any) => void;
  readOnly?: boolean;
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function AttendanceSheet({
  records,
  onChange,
  readOnly = false,
}: AttendanceSheetProps) {
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
              <th className="p-4 font-semibold" style={{ color: "var(--text-secondary)" }}>Status Marker</th>
              <th className="p-4 font-semibold" style={{ color: "var(--text-secondary)" }}>Remarks / Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {records.length > 0 ? (
              records.map((record) => (
                <tr key={record.student_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                  {/* Name and avatar */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: "var(--gradient-primary)" }}
                      >
                        {record.student_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: "var(--text-primary)" }}>{record.student_name}</p>
                        {record.class_name && (
                          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{record.class_name}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status buttons */}
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <StatusButton
                        label="Present"
                        active={record.status === "present"}
                        onClick={() => !readOnly && onChange(record.student_id, "status", "present")}
                        activeBg="var(--accent-success)"
                        activeColor="#fff"
                        disabled={readOnly}
                      />
                      <StatusButton
                        label="Absent"
                        active={record.status === "absent"}
                        onClick={() => !readOnly && onChange(record.student_id, "status", "absent")}
                        activeBg="var(--accent-danger)"
                        activeColor="#fff"
                        disabled={readOnly}
                      />
                      <StatusButton
                        label="Leave"
                        active={record.status === "leave"}
                        onClick={() => !readOnly && onChange(record.student_id, "status", "leave")}
                        activeBg="var(--accent-purple)"
                        activeColor="#fff"
                        disabled={readOnly}
                      />
                    </div>
                  </td>

                  {/* Remarks input */}
                  <td className="p-4">
                    <input
                      type="text"
                      disabled={readOnly}
                      value={record.remarks || ""}
                      onChange={(e) => onChange(record.student_id, "remarks", e.target.value || null)}
                      placeholder={readOnly ? "—" : "Add remark (e.g. sick, late)"}
                      className="w-full max-w-md px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      style={{
                        backgroundColor: "var(--background)",
                        borderColor: "var(--card-border)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-8 text-center italic" style={{ color: "var(--text-tertiary)" }}>
                  No students assigned to this batch.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Sub-Component
   ────────────────────────────────────────────── */

interface StatusButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  activeBg: string;
  activeColor: string;
  disabled?: boolean;
}

function StatusButton({
  label,
  active,
  onClick,
  activeBg,
  activeColor,
  disabled = false,
}: StatusButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
        disabled ? "opacity-90" : "cursor-pointer"
      }`}
      style={{
        background: active ? activeBg : "transparent",
        color: active ? activeColor : "var(--text-secondary)",
        border: active ? "none" : "1px solid var(--card-border)",
        boxShadow: active ? "0 2px 6px rgba(0, 0, 0, 0.1)" : "none",
        transform: active ? "scale(1.05)" : "scale(1)",
      }}
    >
      {label}
    </button>
  );
}
