"use client";

import React, { useState, useEffect } from "react";

export interface StudentFormData {
  name: string;
  parent_name: string;
  parent_mobile: string;
  alternate_mobile: string;
  address: string;
  school: string;
  class_name: string;
  subjects: string[];
  joining_date: string;
  monthly_fee: number;
  notes: string;
  profile_image: string;
  batch_ids: string[];
}

interface Batch {
  id: string;
  name: string;
}

interface StudentFormProps {
  initialData?: Partial<StudentFormData>;
  onSubmit: (data: StudentFormData) => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

const AVAILABLE_SUBJECTS = [
  "Rhymes & Stories",
  "Phonics & Reading",
  "Drawing & Craft",
  "General Awareness / GK",
  "Mathematics",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Hindi",
  "Social Studies",
  "EVS",
  "Computer Science",
  "Sanskrit",
  "Gujarati",
  "Marathi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Bengali",
  "Punjabi",
  "Economics",
  "Accountancy",
  "Business Studies",
  "History",
  "Geography",
  "Political Science",
];

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

export default function StudentForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  submitButtonText = "Save Student",
}: StudentFormProps) {
  // 1. Initial State
  const [formData, setFormData] = useState<StudentFormData>({
    name: initialData?.name || "",
    parent_name: initialData?.parent_name || "",
    parent_mobile: initialData?.parent_mobile || "",
    alternate_mobile: initialData?.alternate_mobile || "",
    address: initialData?.address || "",
    school: initialData?.school || "",
    class_name: initialData?.class_name || "Jr. KG",
    subjects: initialData?.subjects || [],
    joining_date: initialData?.joining_date || new Date().toISOString().split("T")[0],
    monthly_fee: initialData?.monthly_fee || 3000,
    notes: initialData?.notes || "",
    profile_image: initialData?.profile_image || "",
    batch_ids: initialData?.batch_ids || [],
  });

  const [batches, setBatches] = useState<Batch[]>([
    { id: "batch-1", name: "Batch 1 (03:00 PM - 05:00 PM)" },
    { id: "batch-2", name: "Batch 2 (05:00 PM - 07:00 PM)" },
  ]);

  const [subjectInput, setSubjectInput] = useState("");

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? (localStorage.getItem("access_token") || localStorage.getItem("token")) : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

  // Load batches from API if available
  useEffect(() => {
    async function loadBatches() {
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/batches?page_size=100`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const items = data.items || data || [];
          if (items.length > 0) {
            setBatches(items.map((b: any) => ({ id: b.id, name: b.name })));
          }
        }
      } catch (err) {
        console.warn("Could not fetch batches from API, using default static list.");
      }
    }
    loadBatches();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "monthly_fee" ? Number(value) : value,
    }));
  };

  const handleSubjectToggle = (subj: string) => {
    setFormData((prev) => {
      const active = prev.subjects.includes(subj);
      return {
        ...prev,
        subjects: active
          ? prev.subjects.filter((s) => s !== subj)
          : [...prev.subjects, subj],
      };
    });
  };

  const handleAddCustomSubject = () => {
    const trimmed = subjectInput.trim();
    if (!trimmed) return;
    if (!formData.subjects.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        subjects: [...prev.subjects, trimmed],
      }));
    }
    setSubjectInput("");
  };

  const handleBatchToggle = (batchId: string) => {
    setFormData((prev) => {
      const active = prev.batch_ids.includes(batchId);
      return {
        ...prev,
        batch_ids: active
          ? prev.batch_ids.filter((id) => id !== batchId)
          : [...prev.batch_ids, batchId],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student Name */}
        <div>
          <label htmlFor="student-name" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Student Name *
          </label>
          <input
            id="student-name"
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Rohan Sharma"
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Parent Name */}
        <div>
          <label htmlFor="parent-name" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Parent / Guardian Name *
          </label>
          <input
            id="parent-name"
            type="text"
            name="parent_name"
            required
            value={formData.parent_name}
            onChange={handleChange}
            placeholder="e.g. Alok Sharma"
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Parent Mobile */}
        <div>
          <label htmlFor="parent-mobile" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Parent Mobile *
          </label>
          <input
            id="parent-mobile"
            type="tel"
            name="parent_mobile"
            required
            value={formData.parent_mobile}
            onChange={handleChange}
            placeholder="e.g. 9876543210"
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Alternate Mobile */}
        <div>
          <label htmlFor="alternate-mobile" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Alternate Mobile
          </label>
          <input
            id="alternate-mobile"
            type="tel"
            name="alternate_mobile"
            value={formData.alternate_mobile}
            onChange={handleChange}
            placeholder="e.g. 9876543212"
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Class Selector */}
        <div>
          <label htmlFor="class-name" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Class / Grade *
          </label>
          <select
            id="class-name"
            name="class_name"
            value={formData.class_name}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          >
            {CLASSES.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {/* School Name */}
        <div>
          <label htmlFor="school-name" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            School Name *
          </label>
          <input
            id="school-name"
            type="text"
            name="school"
            required
            value={formData.school}
            onChange={handleChange}
            placeholder="e.g. St. Xavier High School"
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Monthly Fee */}
        <div>
          <label htmlFor="monthly-fee" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Monthly Tuition Fee (₹) *
          </label>
          <input
            id="monthly-fee"
            type="number"
            name="monthly_fee"
            required
            min={0}
            value={formData.monthly_fee}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Joining Date */}
        <div>
          <label htmlFor="joining-date" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Joining Date *
          </label>
          <input
            id="joining-date"
            type="date"
            name="joining_date"
            required
            value={formData.joining_date}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          Address *
        </label>
        <textarea
          id="address"
          name="address"
          required
          rows={2}
          value={formData.address}
          onChange={handleChange}
          placeholder="e.g. Flat 402, Royal Residency, Saket, Delhi"
          className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          style={{
            backgroundColor: "var(--background)",
            borderColor: "var(--card-border)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {/* Subjects Selection */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Subjects Selection
          </label>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Select standard subjects or type custom below
          </span>
        </div>

        {/* Manual Subject Typing Input Field */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={subjectInput}
            onChange={(e) => setSubjectInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomSubject();
              }
            }}
            placeholder="Type custom or regional subject (e.g. Gujarati, Abacus, French...)"
            className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="button"
            onClick={handleAddCustomSubject}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            + Add Subject
          </button>
        </div>

        {/* Currently Selected Subject Chips (with delete × button) */}
        {formData.subjects.length > 0 && (
          <div className="mb-3 p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/40" style={{ borderColor: "var(--card-border)" }}>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Selected Subjects ({formData.subjects.length}):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {formData.subjects.map((sub) => (
                <span
                  key={sub}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                >
                  {sub}
                  <button
                    type="button"
                    onClick={() => handleSubjectToggle(sub)}
                    className="hover:text-indigo-900 dark:hover:text-white font-bold ml-0.5"
                    title="Remove subject"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Standard Preset Chips */}
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2.5 rounded-lg border" style={{ borderColor: "var(--card-border)", backgroundColor: "var(--background)" }}>
          {AVAILABLE_SUBJECTS.map((sub) => {
            const isSelected = formData.subjects.includes(sub);
            return (
              <button
                type="button"
                key={sub}
                onClick={() => handleSubjectToggle(sub)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                style={{
                  borderColor: isSelected ? undefined : "var(--card-border)",
                  color: isSelected ? undefined : "var(--text-secondary)",
                }}
              >
                {isSelected ? `✓ ${sub}` : sub}
              </button>
            );
          })}
        </div>
      </div>

      {/* Batches Selector */}
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          Assign Batches
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {batches.map((b) => {
            const isChecked = formData.batch_ids.includes(b.id);
            return (
              <div
                key={b.id}
                onClick={() => handleBatchToggle(b.id)}
                className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all duration-200 ${
                  isChecked
                    ? "bg-cyan-50 border-cyan-400 dark:bg-cyan-950/20"
                    : "hover:bg-slate-50 dark:hover:bg-slate-850"
                }`}
                style={{
                  borderColor: isChecked ? undefined : "var(--card-border)",
                }}
              >
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                  {b.name}
                </span>
                <button
                  type="button"
                  aria-checked={isChecked}
                  role="checkbox"
                  className={`w-4 h-4 rounded flex items-center justify-center border text-white ${
                    isChecked ? "bg-cyan-500 border-cyan-500" : ""
                  }`}
                  style={{ borderColor: isChecked ? undefined : "var(--card-border)" }}
                >
                  {isChecked && (
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.208Z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          Internal Remarks / Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={formData.notes}
          onChange={handleChange}
          placeholder="Any special remarks or details..."
          className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          style={{
            backgroundColor: "var(--background)",
            borderColor: "var(--card-border)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {/* Profile Image link */}
      <div>
        <label htmlFor="profile-image" className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          Profile Image URL (Optional)
        </label>
        <input
          id="profile-image"
          type="url"
          name="profile_image"
          value={formData.profile_image}
          onChange={handleChange}
          placeholder="https://example.com/avatar.jpg"
          className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          style={{
            backgroundColor: "var(--background)",
            borderColor: "var(--card-border)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {/* Actions */}
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
          className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 cursor-pointer disabled:opacity-50"
          style={{
            background: "var(--gradient-primary)",
          }}
        >
          {isSubmitting ? "Saving..." : submitButtonText}
        </button>
      </div>
    </form>
  );
}
