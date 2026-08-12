/**
 * Shared TypeScript types for all report data shapes used in the frontend.
 */

export type ReportType =
  | "fee_collection"
  | "pending_fees"
  | "attendance"
  | "student_performance"
  | "batch"
  | "monthly_summary";

export type ExportFormat = "pdf" | "excel";

/* ── Date Range ─────────────────────────────────────────────── */
export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/* ── Fee Collection ─────────────────────────────────────────── */
export interface FeeCollectionRow {
  student_id: string;
  student_name: string;
  class_name: string;
  month: string;
  base_amount: number;
  discount: number;
  extra_charges: number;
  net_amount: number;
  paid_amount: number;
  balance: number;
  status: "pending" | "partially_paid" | "paid";
  payment_modes: string[];
  last_payment_date: string | null;
}

export interface ByMode {
  cash: number;
  upi: number;
  bank_transfer: number;
}

export interface FeeCollectionReport {
  start_date: string;
  end_date: string;
  total_expected: number;
  total_collected: number;
  total_pending: number;
  collection_rate: number;
  total_students: number;
  paid_count: number;
  partially_paid_count: number;
  pending_count: number;
  by_mode: ByMode;
  rows: FeeCollectionRow[];
}

/* ── Pending Fees ───────────────────────────────────────────── */
export interface PendingFeeRow {
  student_id: string;
  student_name: string;
  class_name: string;
  month: string;
  net_amount: number;
  paid_amount: number;
  balance: number;
  due_date: string;
  days_overdue: number;
  status: "pending" | "partially_paid";
}

export interface PendingFeesReport {
  as_of_date: string;
  total_pending_amount: number;
  total_records: number;
  rows: PendingFeeRow[];
}

/* ── Attendance ─────────────────────────────────────────────── */
export interface AttendanceStudentRow {
  student_id: string;
  student_name: string;
  class_name: string;
  batch_name: string | null;
  total_sessions: number;
  present: number;
  absent: number;
  leave: number;
  attendance_percentage: number;
}

export interface AttendanceDailyRow {
  date: string;
  batch_name: string | null;
  total_students: number;
  present: number;
  absent: number;
  leave: number;
  attendance_rate: number;
}

export interface AttendanceReport {
  start_date: string;
  end_date: string;
  batch_id: string | null;
  overall_rate: number;
  total_sessions: number;
  student_rows: AttendanceStudentRow[];
  daily_rows: AttendanceDailyRow[];
}

/* ── Student Performance ────────────────────────────────────── */
export interface StudentPerformanceRow {
  student_id: string;
  student_name: string;
  class_name: string;
  total_tests: number;
  avg_score_percentage: number;
  highest_score_percentage: number;
  lowest_score_percentage: number;
  attendance_percentage: number;
  outstanding_balance: number;
}

export interface StudentPerformanceReport {
  start_date: string;
  end_date: string;
  rows: StudentPerformanceRow[];
}

/* ── Batch Report ───────────────────────────────────────────── */
export interface BatchReportRow {
  batch_id: string;
  batch_name: string;
  subject: string;
  teacher: string;
  days: string[];
  timing: string;
  total_students: number;
  max_students: number;
  attendance_rate: number;
  total_fee_collected: number;
  total_fee_pending: number;
}

export interface BatchReport {
  start_date: string;
  end_date: string;
  rows: BatchReportRow[];
}

/* ── Monthly Summary ────────────────────────────────────────── */
export interface MonthlySummaryRow {
  month: string;
  active_students: number;
  total_sessions: number;
  avg_attendance_rate: number;
  fees_expected: number;
  fees_collected: number;
  fees_pending: number;
  collection_rate: number;
  tests_conducted: number;
}

export interface MonthlySummaryReport {
  start_date: string;
  end_date: string;
  rows: MonthlySummaryRow[];
}
