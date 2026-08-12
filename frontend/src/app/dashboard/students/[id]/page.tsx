"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PersonalDetailsTab from "@/components/students/personal-details-tab";
import FeeHistoryTab from "@/components/students/fee-history-tab";
import AttendanceTab from "@/components/students/attendance-tab";
import TestScoresTab from "@/components/students/test-scores-tab";
import BatchesTab from "@/components/students/batches-tab";
import ActivityTimelineTab from "@/components/students/activity-timeline-tab";

interface Batch {
  id: string;
  name: string;
  description?: string | null;
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  status: string;
  method: string;
  remarks?: string | null;
}

interface Attendance {
  id: string;
  date: string;
  status: string;
  remarks?: string | null;
}

interface TestScore {
  id: string;
  test_name: string;
  date: string;
  max_marks: number;
  marks_obtained: number;
  remarks?: string | null;
}

interface StudentDetail {
  id: string;
  name: string;
  parent_name: string;
  parent_mobile: string;
  alternate_mobile?: string | null;
  address: string;
  school: string;
  class_name: string;
  subjects: string[];
  joining_date: string;
  monthly_fee: number;
  notes?: string | null;
  profile_image?: string | null;
  is_active: boolean;
  batches: Batch[];
  payments: Payment[];
  attendance_records: Attendance[];
  test_scores: TestScore[];
}

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token") || localStorage.getItem("token")
      : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    async function loadStudentDetails() {
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/students/${studentId}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (res.ok) {
          const data: StudentDetail = await res.json();
          setStudent(data);
        } else {
          throw new Error();
        }
      } catch (err) {
        // Mock Fallback Load
        const localStr = localStorage.getItem("local_students");
        if (localStr) {
          const list: any[] = JSON.parse(localStr);
          const found = list.find((s) => s.id === studentId);
          if (found) {
            setStudent({
              ...found,
              payments: found.payments || [],
              attendance_records: found.attendance_records || [],
              test_scores: found.test_scores || [],
            });
          }
        }
      } finally {
        setLoading(false);
      }
    }

    loadStudentDetails();
  }, [studentId]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this student profile?")) return;

    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/students/${studentId}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token") || ""}`,
        },
      });
      if (res.ok) {
        router.push("/dashboard/students");
      } else {
        throw new Error();
      }
    } catch (err) {
      // Mock delete
      const localStr = localStorage.getItem("local_students");
      if (localStr) {
        const list: any[] = JSON.parse(localStr);
        const updated = list.filter((s) => s.id !== studentId);
        localStorage.setItem("local_students", JSON.stringify(updated));
      }
      router.push("/dashboard/students");
    }
  };

  const handleUpdatePayment = (newPay: Payment) => {
    setStudent((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        payments: [newPay, ...prev.payments],
      };
    });
  };

  const handleUpdateAttendance = (newAtt: Attendance) => {
    setStudent((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        attendance_records: [newAtt, ...prev.attendance_records],
      };
    });
  };

  const handleUpdateScore = (newScore: TestScore) => {
    setStudent((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        test_scores: [newScore, ...prev.test_scores],
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading profile details...
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 text-center italic" style={{ color: "var(--text-tertiary)" }}>
        Student profile details not found.
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      {/* ── Top Header Profile Panel ── */}
      <div
        className="p-6 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-6"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="flex items-center gap-4">
          {/* Avatar URL or dynamic letters */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold border-2"
            style={{
              background: "var(--gradient-primary)",
              borderColor: "var(--card-border)",
            }}
          >
            {student.profile_image ? (
              <img
                src={student.profile_image}
                alt={student.name}
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              student.name.slice(0, 2).toUpperCase()
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                {student.name}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-md border" style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}>
                {student.class_name}
              </span>
            </div>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Parent Contact: {student.parent_mobile}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {student.batches.map((b) => (
                <span
                  key={b.id}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400"
                >
                  {b.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Panel Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/dashboard/students/${studentId}/edit`}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
          >
            Edit Profile
          </Link>
          <button
            onClick={handleDelete}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/20"
          >
            Delete Profile
          </button>
        </div>
      </div>

      {/* ── Tabs Workspace Navigation ── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="flex border-b" style={{ borderColor: "var(--card-border)" }}>
          {[
            { id: "details", label: "Personal Details" },
            { id: "batches", label: "Enrolled Batches" },
            { id: "fees", label: "Fee History" },
            { id: "attendance", label: "Attendance" },
            { id: "scores", label: "Test Scores" },
            { id: "timeline", label: "Activity Timeline" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent hover:text-slate-900 dark:hover:text-slate-100"
                }`}
                style={{ color: isActive ? undefined : "var(--text-secondary)" }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content rendering */}
        <div>
          {activeTab === "details" && <PersonalDetailsTab student={student} />}
          {activeTab === "batches" && <BatchesTab batches={student.batches} />}
          {activeTab === "fees" && (
            <FeeHistoryTab
              studentId={studentId}
              payments={student.payments}
              onPaymentAdded={handleUpdatePayment}
            />
          )}
          {activeTab === "attendance" && (
            <AttendanceTab
              studentId={studentId}
              records={student.attendance_records}
              onRecordAdded={handleUpdateAttendance}
            />
          )}
          {activeTab === "scores" && (
            <TestScoresTab
              studentId={studentId}
              scores={student.test_scores}
              onScoreAdded={handleUpdateScore}
            />
          )}
          {activeTab === "timeline" && (
            <div className="p-6">
              <ActivityTimelineTab
                studentId={studentId}
                joiningDate={student.joining_date}
                studentName={student.name}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
