"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CalendarView from "@/components/attendance/calendar-view";
import AttendanceStatsCard from "@/components/attendance/attendance-stats-card";
import AttendanceTrendsChart from "@/components/attendance/attendance-trends-chart";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface BatchItem {
  id: string;
  name: string;
}

interface TrendItem {
  label: string;
  present_count: number;
  absent_count: number;
  leave_count: number;
  attendance_rate: number;
}

interface AttendanceLog {
  id: string;
  student_name: string;
  batch_name: string;
  date: string;
  status: "present" | "absent" | "leave";
  remarks: string | null;
}

/* ──────────────────────────────────────────────
   Default 2 Batches Initializer
   ────────────────────────────────────────────── */

const DEFAULT_2_BATCHES: BatchItem[] = [
  { id: "batch-1", name: "Batch 1 (03:00 PM - 05:00 PM)" },
  { id: "batch-2", name: "Batch 2 (05:00 PM - 07:00 PM)" },
];

const INITIAL_STATS = {
  presentCount: 0,
  absentCount: 0,
  leaveCount: 0,
  totalSessions: 0,
  attendancePercentage: 0,
};

const MOCK_LOGS: AttendanceLog[] = [];

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function AttendanceDashboardPage() {
  const router = useRouter();
  
  // Selection / Config
  const [batches, setBatches] = useState<BatchItem[]>(DEFAULT_2_BATCHES);
  const [selectedBatchMark, setSelectedBatchMark] = useState(DEFAULT_2_BATCHES[0].id);
  const [markDate, setMarkDate] = useState(new Date().toISOString().split("T")[0]);
  const [calendarMonth, setCalendarMonth] = useState(new Date().toISOString().slice(0, 7));

  // Trends
  const [trendsView, setTrendsView] = useState<"daily" | "weekly" | "monthly">("daily");
  const [trendsData, setTrendsData] = useState<TrendItem[]>([]);

  // Stats
  const [stats, setStats] = useState(INITIAL_STATS);

  // Search logs
  const [searchName, setSearchName] = useState("");
  const [searchBatch, setSearchBatch] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Page initialization
  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await fetch(`${API_BASE}/batches?page_size=100`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const items = (data.items || []).map((b: any) => ({ id: b.id, name: b.name }));
          if (items.length > 0) {
            setBatches(items);
            setSelectedBatchMark(items[0].id);
          }
        }
      } catch {
        setBatches(DEFAULT_2_BATCHES);
        setSelectedBatchMark(DEFAULT_2_BATCHES[0].id);
      }
    }
    loadBatches();
  }, []);

  // Fetch Trends & Stats
  useEffect(() => {
    async function loadStatsAndTrends() {
      try {
        // Stats calculations
        const resTrends = await fetch(`${API_BASE}/attendance/trends?view=${trendsView}`, {
          headers: getAuthHeaders(),
        });
        if (resTrends.ok) {
          const data = await resTrends.json();
          setTrendsData(data.items);
          
          // Recompute stats aggregates based on trends
          let pres = 0;
          let abs = 0;
          let lve = 0;
          data.items.forEach((item: TrendItem) => {
            pres += item.present_count;
            abs += item.absent_count;
            lve += item.leave_count;
          });
          const tot = pres + abs + lve;
          setStats({
            presentCount: pres,
            absentCount: abs,
            leaveCount: lve,
            totalSessions: tot,
            attendancePercentage: tot > 0 ? Number((pres / tot * 100).toFixed(1)) : 100.0,
          });
        }
      } catch {
        setTrendsData([]);
        setStats(INITIAL_STATS);
      }
    }
    loadStatsAndTrends();
  }, [trendsView]);

  // Fetch Logs list
  useEffect(() => {
    async function searchLogs() {
      setLoadingLogs(true);
      try {
        const params = new URLSearchParams({ page: "1", page_size: "20" });
        if (searchName) params.append("student_name", searchName);
        if (searchBatch) params.append("batch_id", searchBatch);
        if (searchStatus) params.append("status", searchStatus);

        const res = await fetch(`${API_BASE}/attendance/search?${params}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data.items.map((i: any) => ({
            id: i.id,
            student_name: i.student_name,
            batch_name: i.batch_id, // we map directly or fetch batch details
            date: i.date,
            status: i.status,
            remarks: i.remarks,
          })));
        } else {
          throw new Error();
        }
      } catch {
        // Fallback filter
        let filtered = [...MOCK_LOGS];
        if (searchName) {
          filtered = filtered.filter((l) => l.student_name.toLowerCase().includes(searchName.toLowerCase()));
        }
        if (searchStatus) {
          filtered = filtered.filter((l) => l.status === searchStatus);
        }
        setLogs(filtered);
      }
      setLoadingLogs(false);
    }
    searchLogs();
  }, [searchName, searchBatch, searchStatus]);

  const handleRedirectMark = () => {
    if (!selectedBatchMark) return;
    router.push(`/dashboard/attendance/mark?batch_id=${selectedBatchMark}&date=${markDate}`);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Attendance Dashboard
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Mark student class sheets, monitor daily center aggregates, and analyze billing statistics.
          </p>
        </div>
      </div>

      {/* Quick Mark Widget Bar */}
      <div
        className="p-5 border rounded-xl"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Mark Attendance Sheet</h4>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Select Batch
            </label>
            <select
              value={selectedBatchMark}
              onChange={(e) => setSelectedBatchMark(e.target.value)}
              className="w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--card-border)",
                color: "var(--text-primary)",
              }}
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[150px]">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Choose Date
            </label>
            <input
              type="date"
              value={markDate}
              onChange={(e) => setMarkDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none"
              style={{
                backgroundColor: "var(--background)",
                borderColor: "var(--card-border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <button
            onClick={handleRedirectMark}
            className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer hover:scale-[1.02]"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: "0 2px 6px rgba(99, 102, 241, 0.25)",
            }}
          >
            Mark Attendance
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <AttendanceStatsCard {...stats} />

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trends with interval select */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Trends Timeline</h4>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              {(["daily", "weekly", "monthly"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setTrendsView(view)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    trendsView === view ? "bg-white dark:bg-slate-700 shadow-sm" : ""
                  }`}
                  style={{ color: "var(--text-secondary)" }}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
          <AttendanceTrendsChart trends={trendsData} />
        </div>

        {/* Calendar View Card */}
        <div>
          <CalendarView
            month={calendarMonth}
            dailyStats={{}}
            onChangeMonth={setCalendarMonth}
          />
        </div>
      </div>

      {/* Search Logs Panel */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Search Logs</h4>
        
        {/* Filters bar */}
        <div
          className="p-4 border rounded-xl flex flex-wrap gap-4"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
          }}
        >
          <input
            type="text"
            placeholder="Search student name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-1.5 border rounded-lg text-xs focus:outline-none"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          />

          <select
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
            className="w-36 px-3 py-1.5 border rounded-lg text-xs focus:outline-none"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          >
            <option value="">All Statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="leave">Leave</option>
          </select>
        </div>

        {/* Search Results Table */}
        <div
          className="border rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
          }}
        >
          {loadingLogs ? (
            <div className="p-8 text-center text-xs animate-pulse" style={{ color: "var(--text-secondary)" }}>
              Searching attendance logs...
            </div>
          ) : logs.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr style={{ backgroundColor: "var(--card-bg)", borderBottom: "1px solid var(--card-border)" }}>
                  <th className="p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Date</th>
                  <th className="p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Student Name</th>
                  <th className="p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Status</th>
                  <th className="p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Remarks / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="p-3 font-semibold" style={{ color: "var(--text-secondary)" }}>
                      {new Date(log.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-3 font-bold" style={{ color: "var(--text-primary)" }}>{log.student_name}</td>
                    <td className="p-3 font-semibold">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.status === "present"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : log.status === "absent"
                            ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                            : "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 italic" style={{ color: "var(--text-tertiary)" }}>{log.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-center italic" style={{ color: "var(--text-tertiary)" }}>
              No matching attendance logs found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
