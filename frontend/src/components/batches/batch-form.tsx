"use client";

import React, { useState } from "react";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

export interface BatchFormData {
  name: string;
  subject: string;
  teacher: string;
  days: string[];
  timing: string;
  max_students: number;
  description: string;
}

interface BatchFormProps {
  initialData?: Partial<BatchFormData>;
  onSubmit: (data: BatchFormData) => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

/* ──────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────── */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Science",
  "Social Studies",
  "Computer Science",
];

/* ──────────────────────────────────────────────
   Validation
   ────────────────────────────────────────────── */

interface FormErrors {
  name?: string;
  subject?: string;
  teacher?: string;
  days?: string;
  timing?: string;
  max_students?: string;
}

function validate(data: BatchFormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.name || data.name.trim().length < 2) errors.name = "Batch name must be at least 2 characters";
  if (!data.subject || data.subject.trim().length < 2) errors.subject = "Subject is required";
  if (!data.teacher || data.teacher.trim().length < 2) errors.teacher = "Teacher name is required";
  if (!data.days || data.days.length === 0) errors.days = "Select at least one day";
  if (!data.timing || data.timing.trim().length < 3) errors.timing = "Timing is required (e.g. 04:00 PM - 05:30 PM)";
  if (!data.max_students || data.max_students < 1) errors.max_students = "Maximum students must be at least 1";
  return errors;
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function BatchForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  submitButtonText = "Save Batch",
}: BatchFormProps) {
  const [formData, setFormData] = useState<BatchFormData>({
    name: initialData?.name || "",
    subject: initialData?.subject || "",
    teacher: initialData?.teacher || "",
    days: initialData?.days || [],
    timing: initialData?.timing || "",
    max_students: initialData?.max_students || 30,
    description: initialData?.description || "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "max_students" ? Number(value) : value,
    }));
    setTouched((prev) => new Set(prev).add(name));
  };

  const handleDayToggle = (day: string) => {
    setFormData((prev) => {
      const active = prev.days.includes(day);
      return {
        ...prev,
        days: active ? prev.days.filter((d) => d !== day) : [...prev.days, day],
      };
    });
    setTouched((prev) => new Set(prev).add("days"));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(formData);
    setErrors(validationErrors);
    // Mark all fields as touched on submit
    setTouched(new Set(["name", "subject", "teacher", "days", "timing", "max_students"]));

    if (Object.keys(validationErrors).length === 0) {
      onSubmit(formData);
    }
  };

  const showError = (field: keyof FormErrors) => touched.has(field) && errors[field];

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-4xl mx-auto rounded-xl border p-6 md:p-8"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      {/* ── Section: Basic Info ── */}
      <div>
        <h3
          className="text-base font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "var(--gradient-primary)" }}
          >
            1
          </span>
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Batch Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Batch Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Batch 1 (03:00 PM - 05:00 PM)"
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              style={{
                backgroundColor: "var(--background)",
                borderColor: showError("name") ? "var(--accent-danger)" : "var(--card-border)",
                color: "var(--text-primary)",
              }}
            />
            {showError("name") && (
              <p className="text-xs mt-1" style={{ color: "var(--accent-danger)" }}>{errors.name}</p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Subject *
            </label>
            <select
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              style={{
                backgroundColor: "var(--background)",
                borderColor: showError("subject") ? "var(--accent-danger)" : "var(--card-border)",
                color: "var(--text-primary)",
              }}
            >
              <option value="">Select Subject</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {showError("subject") && (
              <p className="text-xs mt-1" style={{ color: "var(--accent-danger)" }}>{errors.subject}</p>
            )}
          </div>

          {/* Teacher */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Teacher *
            </label>
            <input
              type="text"
              name="teacher"
              value={formData.teacher}
              onChange={handleChange}
              placeholder="e.g. Prof. Sharma"
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              style={{
                backgroundColor: "var(--background)",
                borderColor: showError("teacher") ? "var(--accent-danger)" : "var(--card-border)",
                color: "var(--text-primary)",
              }}
            />
            {showError("teacher") && (
              <p className="text-xs mt-1" style={{ color: "var(--accent-danger)" }}>{errors.teacher}</p>
            )}
          </div>

          {/* Max Students */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Maximum Students *
            </label>
            <input
              type="number"
              name="max_students"
              min={1}
              max={200}
              value={formData.max_students}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              style={{
                backgroundColor: "var(--background)",
                borderColor: showError("max_students") ? "var(--accent-danger)" : "var(--card-border)",
                color: "var(--text-primary)",
              }}
            />
            {showError("max_students") && (
              <p className="text-xs mt-1" style={{ color: "var(--accent-danger)" }}>{errors.max_students}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Section: Schedule ── */}
      <div>
        <h3
          className="text-base font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "var(--gradient-secondary)" }}
          >
            2
          </span>
          Schedule
        </h3>

        {/* Days Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            Class Days *
          </label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => {
              const isActive = formData.days.includes(day);
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleDayToggle(day)}
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer"
                  style={{
                    background: isActive ? "var(--gradient-primary)" : "transparent",
                    color: isActive ? "#fff" : "var(--text-secondary)",
                    border: isActive ? "none" : "1px solid var(--card-border)",
                    boxShadow: isActive ? "0 2px 8px rgba(99, 102, 241, 0.3)" : "none",
                    transform: isActive ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {showError("days") && (
            <p className="text-xs mt-1.5" style={{ color: "var(--accent-danger)" }}>{errors.days}</p>
          )}
        </div>

        {/* Timing */}
        <div className="max-w-md">
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Timing *
          </label>
          <input
            type="text"
            name="timing"
            value={formData.timing}
            onChange={handleChange}
            placeholder="e.g. 04:00 PM - 05:30 PM"
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{
              backgroundColor: "var(--background)",
              borderColor: showError("timing") ? "var(--accent-danger)" : "var(--card-border)",
              color: "var(--text-primary)",
            }}
          />
          {showError("timing") && (
            <p className="text-xs mt-1" style={{ color: "var(--accent-danger)" }}>{errors.timing}</p>
          )}
        </div>
      </div>

      {/* ── Section: Description ── */}
      <div>
        <h3
          className="text-base font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "var(--gradient-success)" }}
          >
            3
          </span>
          Additional Details
        </h3>
        <textarea
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          placeholder="Optional batch description, notes, or syllabus overview..."
          className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          style={{
            backgroundColor: "var(--background)",
            borderColor: "var(--card-border)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--card-border)" }}>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 border rounded-lg text-sm font-semibold transition-colors duration-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
          style={{
            borderColor: "var(--card-border)",
            color: "var(--text-secondary)",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 cursor-pointer disabled:opacity-50 hover:scale-[1.02]"
          style={{
            background: "var(--gradient-primary)",
            boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
          }}
        >
          {isSubmitting ? "Saving..." : submitButtonText}
        </button>
      </div>
    </form>
  );
}
