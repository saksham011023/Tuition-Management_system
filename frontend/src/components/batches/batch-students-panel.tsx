"use client";

import React, { useState, useEffect, useRef } from "react";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface BatchStudent {
  id: string;
  name: string;
  class_name: string;
  is_active: boolean;
}

interface SearchStudent {
  id: string;
  name: string;
  class_name: string;
}

interface BatchStudentsPanelProps {
  batchId: string;
  students: BatchStudent[];
  maxStudents: number;
  onAssign: (studentIds: string[]) => Promise<void>;
  onRemove: (studentIds: string[]) => Promise<void>;
}

/* ──────────────────────────────────────────────
   API Helper
   ────────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function BatchStudentsPanel({
  batchId,
  students,
  maxStudents,
  onAssign,
  onRemove,
}: BatchStudentsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchStudent[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const enrolledIds = new Set(students.map((s) => s.id));
  const isFull = students.length >= maxStudents;

  // Search for students to add
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `${API_BASE}/students?search=${encodeURIComponent(searchQuery)}&page_size=10`,
          { headers: getAuthHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          // Filter out students already enrolled
          const available = data.items
            .filter((s: SearchStudent) => !enrolledIds.has(s.id))
            .map((s: SearchStudent) => ({ id: s.id, name: s.name, class_name: s.class_name }));
          setSearchResults(available);
          setShowDropdown(available.length > 0);
        }
      } catch {
        // Silently fail — user can still manage existing students
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleAssign = async (studentId: string) => {
    setShowDropdown(false);
    setSearchQuery("");
    await onAssign([studentId]);
  };

  const handleRemove = async (studentId: string) => {
    if (!window.confirm("Remove this student from the batch?")) return;
    setRemovingId(studentId);
    await onRemove([studentId]);
    setRemovingId(null);
  };

  return (
    <div
      className="rounded-xl border"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: "var(--card-border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--gradient-purple)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5} className="w-4 h-4">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                />
              </svg>
            </div>
            <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Enrolled Students
            </h4>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: isFull ? "rgba(239, 68, 68, 0.1)" : "rgba(99, 102, 241, 0.1)",
                color: isFull ? "var(--accent-danger)" : "var(--accent-primary)",
              }}
            >
              {students.length} / {maxStudents}
            </span>
          </div>
        </div>

        {/* Search / Add Student */}
        {!isFull && (
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students to add..."
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
                className="w-4 h-4 absolute left-3 top-2.5"
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
                  className="absolute right-3 top-2.5 w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
                />
              )}
            </div>

            {/* Dropdown Results */}
            {showDropdown && (
              <div
                className="absolute z-20 w-full mt-1 rounded-lg border shadow-lg max-h-48 overflow-y-auto"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--card-border)",
                }}
              >
                {searchResults.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleAssign(s.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {s.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {s.class_name}
                      </p>
                    </div>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded"
                      style={{ color: "var(--accent-success)", backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                    >
                      + Add
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isFull && (
          <p className="text-xs italic" style={{ color: "var(--accent-warning)" }}>
            Batch is at maximum capacity. Remove a student to add a new one.
          </p>
        )}
      </div>

      {/* Student List */}
      <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
        {students.length > 0 ? (
          students.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "var(--gradient-purple)" }}
                >
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {student.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {student.class_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    student.is_active
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                  }`}
                >
                  {student.is_active ? "Active" : "Inactive"}
                </span>
                <button
                  onClick={() => handleRemove(student.id)}
                  disabled={removingId === student.id}
                  className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-950/20 transition-colors cursor-pointer disabled:opacity-40"
                  title="Remove from batch"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>
              No students enrolled yet. Use the search above to add students.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
