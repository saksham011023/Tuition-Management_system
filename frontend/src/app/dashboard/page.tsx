"use client";

import React, { useState, useEffect } from "react";
import StatCard from "@/components/dashboard/stat-card";
import MonthlyCollectionChart from "@/components/dashboard/monthly-collection-chart";
import StudentGrowthChart from "@/components/dashboard/student-growth-chart";
import AttendanceTrendChart from "@/components/dashboard/attendance-trend-chart";
import ActivityFeed from "@/components/dashboard/activity-feed";
import ActivityItem from "@/components/dashboard/activity-item";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";

/* ──────────────────────────────────────────────
   Initial Empty States (Calculated dynamically via API)
   ────────────────────────────────────────────── */

const EMPTY_STATS = [
  { label: "Total Students", value: "0", change: null, changeLabel: null, icon: "students" },
  { label: "Active Batches", value: "0", change: null, changeLabel: null, icon: "batches" },
  { label: "Monthly Collection", value: "₹0", change: null, changeLabel: null, icon: "collection" },
  { label: "Pending Fees", value: "₹0", change: null, changeLabel: null, icon: "pending" },
  { label: "Students with Due Fees", value: "0", change: null, changeLabel: null, icon: "due_fees" },
  { label: "Today's Attendance", value: "0%", change: null, changeLabel: null, icon: "attendance" },
  { label: "Upcoming Tests", value: "0", change: null, changeLabel: null, icon: "tests" },
];

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function getReminderBadgeVariant(days: number): "danger" | "warning" | "neutral" {
  if (days <= 2) return "danger";
  if (days <= 5) return "warning";
  return "neutral";
}

function timeAgo(dateString: string) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `${Math.max(diffMins, 1)} minutes ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} days ago`;
}

/* ──────────────────────────────────────────────
   Page Component
   ────────────────────────────────────────────── */

export default function DashboardPage() {
  const [stats, setStats] = useState<any[]>(EMPTY_STATS);
  const [monthlyCollectionData, setMonthlyCollectionData] = useState<any[]>([]);
  const [studentGrowthData, setStudentGrowthData] = useState<any[]>([]);
  const [attendanceTrendData, setAttendanceTrendData] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [feeReminders, setFeeReminders] = useState<any[]>([]);
  const [latestAdmissions, setLatestAdmissions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  // Load dynamic dashboard data from API
  useEffect(() => {
    async function initDashboard() {
      try {
        const res = await apiClient.get("/dashboard");
        const data = res.data;

        if (data && data.stats) {
          const mappedStats = [
            { ...data.stats.total_students, icon: "students" },
            { ...data.stats.active_batches, icon: "batches" },
            { ...data.stats.monthly_collection, icon: "collection" },
            { ...data.stats.pending_fees, icon: "pending" },
            { ...data.stats.students_with_due_fees, icon: "due_fees" },
            { ...data.stats.todays_attendance, icon: "attendance" },
            { ...data.stats.upcoming_tests, icon: "tests" },
          ];
          setStats(mappedStats);
        }
        
        if (data.monthly_collection_chart?.data) {
          setMonthlyCollectionData(data.monthly_collection_chart.data);
        }
        if (data.student_growth_chart?.data) {
          setStudentGrowthData(data.student_growth_chart.data);
        }
        if (data.attendance_trend_chart?.data) {
          setAttendanceTrendData(data.attendance_trend_chart.data);
        }
        setRecentPayments(data.recent_payments || []);
        setFeeReminders(data.fee_reminders || []);
        setLatestAdmissions(data.latest_admissions || []);

        // Fetch notifications/alerts dynamically
        try {
          const notifRes = await apiClient.get("/dashboard/notifications");
          const notifData = notifRes.data;
          setAlerts(notifData.alerts || []);
          setRecentActivity(notifData.recent_activity || []);
        } catch (e) {
          console.warn("Could not fetch notifications from backend.");
        }
      } catch (err) {
        console.warn("Backend dynamic fetch error.");
      } finally {
        setLoading(false);
      }
    }

    initDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading dashboard diagnostics...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* ── Page header ── */}
      <div>
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Welcome back, {user?.name || "Teacher"} 👋
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Here&apos;s what&apos;s happening with your tuition center today.
        </p>
      </div>

      {/* ── Active Dashboard Alerts ── */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.slice(0, 3).map((alert) => {
            const colorMap: Record<string, { border: string; bg: string; text: string; label: string; iconBg: string }> = {
              red: { border: "border-red-200/60 dark:border-red-900/40", bg: "bg-red-50/50 dark:bg-red-950/10", text: "text-red-800 dark:text-red-200", label: "Alert", iconBg: "bg-red-100/80 dark:bg-red-900/30" },
              blue: { border: "border-blue-200/60 dark:border-blue-900/40", bg: "bg-blue-50/50 dark:bg-blue-950/10", text: "text-blue-800 dark:text-blue-200", label: "Today's Schedule", iconBg: "bg-blue-100/80 dark:bg-blue-900/30" },
              yellow: { border: "border-amber-200/60 dark:border-amber-900/40", bg: "bg-amber-50/50 dark:bg-amber-950/10", text: "text-amber-800 dark:text-amber-200", label: "Notice", iconBg: "bg-amber-100/80 dark:bg-amber-900/30" },
            };
            const c = colorMap[alert.color] || colorMap.blue;
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-4 rounded-2xl border ${c.bg} ${c.border} transition-all duration-200 hover:scale-[1.01]`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.iconBg} ${c.text}`}>
                  {alert.type === "pending_fee" ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : alert.type === "today_class" ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l3.75-2.25L16.5 21l-.813-5.096L20 12.25l-5.125-.747L12 6.875 9.125 11.5 4 12.25l3.563 3.654z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${c.text}`}>
                      {c.label}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {alert.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {alert.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
        {stats.map((s) => (
          <StatCard
            key={s.icon}
            label={s.label}
            value={s.value}
            change={s.change}
            changeLabel={s.changeLabel}
            icon={s.icon}
          />
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthlyCollectionChart data={monthlyCollectionData} />
        <StudentGrowthChart data={studentGrowthData} />
      </div>

      <div className="grid grid-cols-1">
        <AttendanceTrendChart data={attendanceTrendData} />
      </div>

      {/* ── Activity Feeds ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Payments */}
        <ActivityFeed title="Recent Payments" viewAllHref="/dashboard/students">
          {recentPayments.length > 0 ? (
            recentPayments.map((p) => (
              <ActivityItem
                key={p.id}
                type="payment"
                title={p.student_name}
                subtitle={`${p.batch} · ${p.method.toUpperCase()}`}
                badge={`₹${Number(p.amount).toLocaleString("en-IN")}`}
                badgeVariant="success"
                timestamp={p.date.includes("Z") || p.date.includes("-") ? timeAgo(p.date) : p.date}
              />
            ))
          ) : (
            <div className="p-6 text-center italic text-xs" style={{ color: "var(--text-tertiary)" }}>
              No payments recorded yet.
            </div>
          )}
        </ActivityFeed>

        {/* Fee Reminders */}
        <ActivityFeed title="Upcoming Fee Reminders" viewAllHref="/dashboard/students">
          {feeReminders.length > 0 ? (
            feeReminders.map((r) => (
              <ActivityItem
                key={r.id}
                type="reminder"
                title={r.student_name}
                subtitle={r.batch}
                badge={r.days_until_due <= 2 ? `Due in ${r.days_until_due}d` : `${r.days_until_due} days`}
                badgeVariant={getReminderBadgeVariant(r.days_until_due)}
                timestamp={`₹${Number(r.amount_due).toLocaleString("en-IN")}`}
              />
            ))
          ) : (
            <div className="p-6 text-center italic text-xs" style={{ color: "var(--text-tertiary)" }}>
              No fee reminders this month.
            </div>
          )}
        </ActivityFeed>

        {/* Latest Admissions */}
        <ActivityFeed title="Latest Admissions" viewAllHref="/dashboard/students">
          {latestAdmissions.length > 0 ? (
            latestAdmissions.map((a) => (
              <ActivityItem
                key={a.id}
                type="admission"
                title={a.student_name}
                subtitle={`${a.batch} · Guardian: ${a.guardian_name}`}
                timestamp={a.date.includes("Z") || a.date.includes("-") ? timeAgo(a.date) : a.date}
              />
            ))
          ) : (
            <div className="p-6 text-center italic text-xs" style={{ color: "var(--text-tertiary)" }}>
              No admissions enrolled yet.
            </div>
          )}
        </ActivityFeed>
      </div>
    </div>
  );
}
