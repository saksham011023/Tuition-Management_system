"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/page-skeleton";

interface Batch {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  parent_name: string;
  parent_mobile: string;
  class_name: string;
  subjects: string[];
  joining_date: string;
  monthly_fee: number;
  is_active: boolean;
  batches: Batch[];
}

const DEFAULT_STUDENTS: Student[] = [];

const CLASSES = [
  "Nursery",
  "Jr. KG",
  "Sr. KG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11 - Science",
  "Class 11 - Commerce",
  "Class 11 - Arts",
  "Class 12 - Science",
  "Class 12 - Commerce",
  "Class 12 - Arts",
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("access_token") || localStorage.getItem("token")) : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function syncLocalStudentsToDatabase() {
  const stored = localStorage.getItem("local_students");
  if (!stored) return;
  try {
    const localList: any[] = JSON.parse(stored);
    if (!localList || localList.length === 0) return;

    // Get DB batches
    const batchRes = await fetch(`${API_BASE}/batches?page_size=100`, { headers: getAuthHeaders() });
    let dbBatches: any[] = [];
    if (batchRes.ok) {
      const bData = await batchRes.json();
      dbBatches = bData.items || bData || [];
    }

    const remainingLocal = [];

    for (const item of localList) {
      if (item.id && (String(item.id).startsWith("mock-stud-") || String(item.id).startsWith("stud-"))) {
        let validBatchIds: string[] = [];
        if (item.batches && Array.isArray(item.batches)) {
          validBatchIds = item.batches
            .map((b: any) => {
              const found = dbBatches.find((dbB: any) => dbB.name === b.name || dbB.id === b.id);
              return found ? found.id : (dbBatches[0]?.id || null);
            })
            .filter(Boolean);
        }

        const payload = {
          name: item.name,
          parent_name: item.parent_name || "Parent Name",
          parent_mobile: item.parent_mobile || "9999999999",
          alternate_mobile: item.alternate_mobile || null,
          address: item.address || "Main Address",
          school: item.school || "Local School",
          class_name: item.class_name || "Jr. KG",
          subjects: item.subjects || [],
          joining_date: item.joining_date || new Date().toISOString().split("T")[0],
          monthly_fee: Number(item.monthly_fee) || 3000,
          notes: item.notes || null,
          profile_image: item.profile_image || null,
          batch_ids: validBatchIds,
        };

        const createRes = await fetch(`${API_BASE}/students`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        if (!createRes.ok) {
          remainingLocal.push(item);
        }
      } else {
        remainingLocal.push(item);
      }
    }

    if (remainingLocal.length > 0) {
      localStorage.setItem("local_students", JSON.stringify(remainingLocal));
    } else {
      localStorage.removeItem("local_students");
    }
  } catch (err) {
    console.warn("Could not sync local_students to DB:", err);
  }
}

export default function StudentListPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([
    { id: "batch-1", name: "Batch 1 (03:00 PM - 05:00 PM)" },
    { id: "batch-2", name: "Batch 2 (05:00 PM - 07:00 PM)" },
  ]);

  // Query States
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load classes & batches dropdown lists
  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await fetch(`${API_BASE}/batches?page_size=100`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const items = data.items || data || [];
          if (items.length > 0) setBatches(items);
        }
      } catch (err) {
        console.warn("API offline: Using default static batches.");
      }
    }
    loadBatches();
  }, []);

  // Fetch / Query Students
  const fetchStudents = async () => {
    setLoading(true);
    try {
      // First sync any unsynced local_students to DB
      await syncLocalStudentsToDatabase();

      const queryParams = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (search) queryParams.append("search", search);
      if (selectedClass) queryParams.append("class_name", selectedClass);
      if (selectedBatch) queryParams.append("batch_id", selectedBatch);

      const url = `${API_BASE}/students?${queryParams}`;
      const res = await fetch(url, { headers: getAuthHeaders() });

      if (res.ok) {
        const data = await res.json();
        setStudents(data.items || []);
        setTotal(data.total || (data.items ? data.items.length : 0));
      } else {
        throw new Error();
      }
    } catch (err) {
      // Mock Fallback Client Filtering/Sorting/Pagination
      let filtered = [...DEFAULT_STUDENTS];

      // Local storage support to check if student was added/deleted locally
      const stored = localStorage.getItem("local_students");
      if (stored) {
        filtered = JSON.parse(stored);
      } else {
        localStorage.setItem("local_students", JSON.stringify(DEFAULT_STUDENTS));
      }

      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item.name.toLowerCase().includes(s) ||
            item.parent_name.toLowerCase().includes(s) ||
            item.parent_mobile.includes(s)
        );
      }
      if (selectedClass) {
        filtered = filtered.filter((item) => item.class_name === selectedClass);
      }
      if (selectedBatch) {
        filtered = filtered.filter((item) => item.batches.some((b) => b.id === selectedBatch));
      }

      // Sort
      filtered.sort((a, b) => {
        let valA = a[sortBy as keyof Student];
        let valB = b[sortBy as keyof Student];

        if (typeof valA === "string") {
          valA = (valA as string).toLowerCase();
          valB = (valB as string).toLowerCase();
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });

      setTotal(filtered.length);

      // Paginate
      const start = (page - 1) * pageSize;
      const paginated = filtered.slice(start, start + pageSize);
      setStudents(paginated);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, selectedClass, selectedBatch, sortBy, sortOrder, page]);

  const toggleSort = (colName: string) => {
    if (sortBy === colName) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(colName);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;

    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/students/${id}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        fetchStudents();
      } else {
        throw new Error();
      }
    } catch (err) {
      // Mock Fallback Delete
      const stored = localStorage.getItem("local_students");
      if (stored) {
        const list: Student[] = JSON.parse(stored);
        const updated = list.filter((s) => s.id !== id);
        localStorage.setItem("local_students", JSON.stringify(updated));
        fetchStudents();
      }
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Student Management
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Manage details, records, fees, attendance, and batch allocations of all students.
          </p>
        </div>
        <Link
          href="/dashboard/students/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Add Student
        </Link>
      </div>

      {/* Filters & Search Control Bar */}
      <div
        className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center gap-4"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search student, parent contact..."
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
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Filter class */}
        <div className="w-full md:w-48">
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          >
            <option value="">All Classes</option>
            {CLASSES.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {/* Filter batch */}
        <div className="w-full md:w-56">
          <select
            value={selectedBatch}
            onChange={(e) => {
              setSelectedBatch(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Data Grid / Table */}
      {loading ? (
        <TableSkeleton rows={pageSize} cols={6} />
      ) : (
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
                <tr
                  style={{
                    backgroundColor: "var(--card-bg)",
                    borderBottom: "1px solid var(--card-border)",
                  }}
                >
                  <th
                    onClick={() => toggleSort("name")}
                    className="p-4 font-semibold cursor-pointer select-none group"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <div className="flex items-center gap-1">
                      Student Name
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {sortBy === "name" && sortOrder === "desc" ? "↓" : "↑"}
                      </span>
                    </div>
                  </th>
                  <th className="p-4 font-semibold" style={{ color: "var(--text-secondary)" }}>Parent Mobile</th>
                  <th className="p-4 font-semibold" style={{ color: "var(--text-secondary)" }}>Class</th>
                  <th className="p-4 font-semibold" style={{ color: "var(--text-secondary)" }}>Assigned Batch</th>
                  <th
                    onClick={() => toggleSort("monthly_fee")}
                    className="p-4 font-semibold cursor-pointer select-none group"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <div className="flex items-center gap-1">
                      Monthly Fee
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {sortBy === "monthly_fee" && sortOrder === "desc" ? "↓" : "↑"}
                      </span>
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort("joining_date")}
                    className="p-4 font-semibold cursor-pointer select-none group"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <div className="flex items-center gap-1">
                      Joining Date
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {sortBy === "joining_date" && sortOrder === "desc" ? "↓" : "↑"}
                      </span>
                    </div>
                  </th>
                  <th className="p-4 font-semibold text-right" style={{ color: "var(--text-secondary)" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center" style={{ color: "var(--text-tertiary)" }}>
                      No students found matching current filters.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors"
                    >
                      {/* Name */}
                      <td className="p-4 font-medium" style={{ color: "var(--text-primary)" }}>
                        <Link href={`/dashboard/students/${student.id}`} className="hover:text-indigo-600">
                          {student.name}
                        </Link>
                      </td>
                      {/* Parent Mobile */}
                      <td className="p-4" style={{ color: "var(--text-secondary)" }}>
                        {student.parent_mobile}
                      </td>
                      {/* Class */}
                      <td className="p-4" style={{ color: "var(--text-secondary)" }}>
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800">
                          {student.class_name}
                        </span>
                      </td>
                      {/* Batches */}
                      <td className="p-4" style={{ color: "var(--text-secondary)" }}>
                        {student.batches && student.batches.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {student.batches.map((b) => (
                              <span
                                key={b.id}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/50"
                              >
                                {b.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            Unassigned
                          </span>
                        )}
                      </td>
                      {/* Monthly Fee */}
                      <td className="p-4 font-semibold" style={{ color: "var(--text-primary)" }}>
                        ₹{student.monthly_fee.toLocaleString()}
                      </td>
                      {/* Joining Date */}
                      <td className="p-4" style={{ color: "var(--text-secondary)" }}>
                        {new Date(student.joining_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/dashboard/students/${student.id}`}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="View Profile"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-500">
                              <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                              <path fillRule="evenodd" d="M.664 9.571a1.008 1.008 0 0 0 0 1.157C1.963 12.485 5.619 16 10 16s8.037-3.515 9.336-5.272a1.008 1.008 0 0 0 0-1.157C18.037 7.515 14.381 4 10 4S1.963 7.515.664 9.571ZM10 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" clipRule="evenodd" />
                            </svg>
                          </Link>
                          <Link
                            href={`/dashboard/students/${student.id}/edit`}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-500">
                              <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.313.313-.703.524-1.133.614l-3.154 1.262a.5.5 0 0 1-.66-.66Z" />
                              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75V4H2.75a.75.75 0 0 0 0 1.5h14.5a.75.75 0 0 0 0-1.5H14v-.25A2.75 2.75 0 0 0 11.25 1h-2.5ZM8 3.75A1.25 1.25 0 0 1 9.25 2.5h2.5A1.25 1.25 0 0 1 13 3.75V4H8v-.25ZM3.5 6.5h13a.5.5 0 0 1 .5.5v9.75A2.75 2.75 0 0 1 14.25 19H5.75A2.75 2.75 0 0 1 3 16.25V7a.5.5 0 0 1 .5-.5Z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div
            className="px-6 py-4 flex items-center justify-between border-t"
            style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}
          >
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Showing <b>{students.length}</b> of <b>{total}</b> students (Page <b>{page}</b> of <b>{totalPages}</b>)
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
      )}
    </div>
  );
}
