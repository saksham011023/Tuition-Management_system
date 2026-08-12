"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface BatchListItem {
  id: string;
  name: string;
  subject: string;
  teacher: string;
  days: string[];
  timing: string;
  max_students: number;
  student_count: number;
  description: string | null;
  created_at: string;
}

/* ──────────────────────────────────────────────
   Mock Data
   ────────────────────────────────────────────── */

const DEFAULT_BATCHES: BatchListItem[] = [
  {
    id: "batch-1",
    name: "Batch 1 (03:00 PM - 05:00 PM)",
    subject: "All Subjects",
    teacher: "Academy Teacher",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    timing: "03:00 PM - 05:00 PM",
    max_students: 30,
    student_count: 0,
    description: "Daily afternoon batch from 3:00 PM to 5:00 PM",
    created_at: new Date().toISOString(),
  },
  {
    id: "batch-2",
    name: "Batch 2 (05:00 PM - 07:00 PM)",
    subject: "All Subjects",
    teacher: "Academy Teacher",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    timing: "05:00 PM - 07:00 PM",
    max_students: 30,
    student_count: 0,
    description: "Daily evening batch from 5:00 PM to 7:00 PM",
    created_at: new Date().toISOString(),
  },
];

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

function capacityColor(count: number, max: number): string {
  const pct = max > 0 ? (count / max) * 100 : 0;
  if (pct >= 100) return "var(--accent-danger)";
  if (pct >= 80) return "var(--accent-warning)";
  return "var(--accent-success)";
}

/* ──────────────────────────────────────────────
   Page Component
   ────────────────────────────────────────────── */

export default function BatchListPage() {
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBatches = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (search) params.append("search", search);

      const res = await fetch(`${API_BASE}/batches?${params}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBatches(data.items);
        setTotal(data.total);
      } else {
        throw new Error();
      }
    } catch {
      // Fallback to mock data with local filtering
      let filtered = [...DEFAULT_BATCHES];

      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (b) =>
            b.name.toLowerCase().includes(s) ||
            b.subject.toLowerCase().includes(s) ||
            b.teacher.toLowerCase().includes(s)
        );
      }

      filtered.sort((a, b) => {
        const valA = String(a[sortBy as keyof BatchListItem] ?? "").toLowerCase();
        const valB = String(b[sortBy as keyof BatchListItem] ?? "").toLowerCase();
        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });

      setTotal(filtered.length);
      const start = (page - 1) * pageSize;
      setBatches(filtered.slice(start, start + pageSize));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBatches();
  }, [search, sortBy, sortOrder, page]);

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder((p) => (p === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this batch?")) return;
    try {
      const res = await fetch(`${API_BASE}/batches/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        fetchBatches();
      } else {
        throw new Error();
      }
    } catch {
      // Local mock delete
      const updated = DEFAULT_BATCHES.filter((b) => b.id !== id);
      setBatches(updated);
      setTotal(updated.length);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading batches...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Batch Management
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Create, manage, and organize batches. Assign students and track schedules.
          </p>
        </div>
        <Link
          href="/dashboard/batches/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
          style={{ background: "var(--gradient-primary)", boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)" }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Create Batch
        </Link>
      </div>

      {/* Search Bar */}
      <div
        className="p-4 rounded-xl border"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by batch name, subject, or teacher..."
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
        </div>
      </div>

      {/* Data Table */}
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
                <SortableHeader label="Batch Name" col="name" sortBy={sortBy} sortOrder={sortOrder} onClick={toggleSort} />
                <SortableHeader label="Subject" col="subject" sortBy={sortBy} sortOrder={sortOrder} onClick={toggleSort} />
                <SortableHeader label="Teacher" col="teacher" sortBy={sortBy} sortOrder={sortOrder} onClick={toggleSort} />
                <th className="p-4 font-semibold" style={{ color: "var(--text-secondary)" }}>Days</th>
                <th className="p-4 font-semibold" style={{ color: "var(--text-secondary)" }}>Timing</th>
                <th className="p-4 font-semibold" style={{ color: "var(--text-secondary)" }}>Capacity</th>
                <th className="p-4 font-semibold text-right" style={{ color: "var(--text-secondary)" }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {batches.length > 0 ? (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="p-4">
                      <Link
                        href={`/dashboard/batches/${batch.id}`}
                        className="font-bold hover:underline"
                        style={{ color: "var(--accent-primary)" }}
                      >
                        {batch.name}
                      </Link>
                    </td>
                    <td className="p-4" style={{ color: "var(--text-secondary)" }}>{batch.subject}</td>
                    <td className="p-4" style={{ color: "var(--text-secondary)" }}>{batch.teacher}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {batch.days.map((d) => (
                          <span
                            key={d}
                            className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: "rgba(99, 102, 241, 0.1)",
                              color: "var(--accent-primary)",
                            }}
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4" style={{ color: "var(--text-secondary)" }}>{batch.timing}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-16 h-1.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: "var(--background)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min((batch.student_count / batch.max_students) * 100, 100)}%`,
                              backgroundColor: capacityColor(batch.student_count, batch.max_students),
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                          {batch.student_count}/{batch.max_students}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Link
                        href={`/dashboard/batches/${batch.id}`}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded border hover:bg-slate-50 dark:hover:bg-slate-800"
                        style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
                      >
                        View
                      </Link>
                      <Link
                        href={`/dashboard/batches/${batch.id}/edit`}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded border hover:bg-indigo-50 dark:hover:bg-indigo-950"
                        style={{ borderColor: "var(--card-border)", color: "var(--accent-primary)" }}
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(batch.id)}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/20"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center italic" style={{ color: "var(--text-tertiary)" }}>
                    No batches found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="px-6 py-4 flex items-center justify-between border-t"
          style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Showing <b>{batches.length}</b> of <b>{total}</b> batches (Page <b>{page}</b> of <b>{totalPages}</b>)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
            >
              Previous
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Sub-Components
   ────────────────────────────────────────────── */

function SortableHeader({
  label,
  col,
  sortBy,
  sortOrder,
  onClick,
}: {
  label: string;
  col: string;
  sortBy: string;
  sortOrder: string;
  onClick: (col: string) => void;
}) {
  return (
    <th
      onClick={() => onClick(col)}
      className="p-4 font-semibold cursor-pointer select-none group"
      style={{ color: "var(--text-secondary)" }}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
          {sortBy === col && sortOrder === "desc" ? "↓" : "↑"}
        </span>
      </div>
    </th>
  );
}
