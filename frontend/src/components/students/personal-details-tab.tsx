"use client";

import React from "react";

interface Student {
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
}

export default function PersonalDetailsTab({ student }: { student: Student }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 animate-fade-in">
      {/* Basic Profile */}
      <div
        className="p-6 rounded-xl border space-y-4"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        <h3 className="text-base font-semibold border-b pb-2" style={{ color: "var(--text-primary)", borderColor: "var(--card-border)" }}>
          Contact & Core Details
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs">Parent / Guardian</p>
            <p className="font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{student.parent_name}</p>
          </div>
          <div>
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs">Primary Contact</p>
            <p className="font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{student.parent_mobile}</p>
          </div>
          {student.alternate_mobile && (
            <div>
              <p style={{ color: "var(--text-tertiary)" }} className="text-xs">Alternate Contact</p>
              <p className="font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{student.alternate_mobile}</p>
            </div>
          )}
          <div>
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs">Status</p>
            <span
              className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${
                student.is_active
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                  : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
              }`}
            >
              {student.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* School & Academics */}
      <div
        className="p-6 rounded-xl border space-y-4"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        <h3 className="text-base font-semibold border-b pb-2" style={{ color: "var(--text-primary)", borderColor: "var(--card-border)" }}>
          Academic Information
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs">School</p>
            <p className="font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{student.school}</p>
          </div>
          <div>
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs">Class / Grade</p>
            <p className="font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{student.class_name}</p>
          </div>
          <div className="col-span-2">
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs mb-1">Enrolled Subjects</p>
            <div className="flex flex-wrap gap-1.5">
              {student.subjects.length > 0 ? (
                student.subjects.map((sub) => (
                  <span
                    key={sub}
                    className="text-xs px-2.5 py-0.5 rounded-md border"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
                  >
                    {sub}
                  </span>
                ))
              ) : (
                <span className="text-xs italic" style={{ color: "var(--text-tertiary)" }}>None selected</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tuition Details */}
      <div
        className="p-6 rounded-xl border space-y-4 md:col-span-2"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        <h3 className="text-base font-semibold border-b pb-2" style={{ color: "var(--text-primary)", borderColor: "var(--card-border)" }}>
          Enrollment & Billing
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs">Monthly Fees</p>
            <p className="text-xl font-bold mt-0.5" style={{ color: "var(--accent-primary)" }}>
              ₹{student.monthly_fee.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs">Joining Date</p>
            <p className="font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
              {new Date(student.joining_date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div>
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs">Address</p>
            <p className="mt-1" style={{ color: "var(--text-secondary)" }}>{student.address}</p>
          </div>
        </div>

        {student.notes && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--card-border)" }}>
            <p style={{ color: "var(--text-tertiary)" }} className="text-xs mb-1">Administrative Notes</p>
            <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>{student.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
