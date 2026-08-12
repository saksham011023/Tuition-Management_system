"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import StudentForm, { StudentFormData } from "@/components/students/student-form";

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token") || localStorage.getItem("token")
      : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function NewStudentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: StudentFormData) => {
    setIsSubmitting(true);

    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/students`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push("/dashboard/students");
      } else {
        throw new Error();
      }
    } catch (err) {
      // Mock Fallback Save to LocalStorage
      const localStr = localStorage.getItem("local_students");
      let list = [];
      if (localStr) {
        list = JSON.parse(localStr);
      }

      const mockStudent = {
        id: `mock-stud-${Date.now()}`,
        name: formData.name,
        parent_name: formData.parent_name,
        parent_mobile: formData.parent_mobile,
        alternate_mobile: formData.alternate_mobile,
        address: formData.address,
        school: formData.school,
        class_name: formData.class_name,
        subjects: formData.subjects,
        joining_date: formData.joining_date,
        monthly_fee: formData.monthly_fee,
        notes: formData.notes,
        profile_image: formData.profile_image,
        is_active: true,
        batches: formData.batch_ids.map((id) => ({
          id,
          name: id === "batch-1"
            ? "Batch 1 (03:00 PM - 05:00 PM)"
            : "Batch 2 (05:00 PM - 07:00 PM)",
        })),
        payments: [],
        attendance_records: [],
        test_scores: [],
      };

      list.push(mockStudent);
      localStorage.setItem("local_students", JSON.stringify(list));
      router.push("/dashboard/students");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Enroll New Student
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Fill in the student profile details below to register.
        </p>
      </div>

      <StudentForm onSubmit={handleSubmit} isSubmitting={isSubmitting} submitButtonText="Enroll Student" />
    </div>
  );
}
