"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import StudentForm, { StudentFormData } from "@/components/students/student-form";

interface Student {
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
  batches: { id: string; name: string }[];
}

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token") || localStorage.getItem("token")
      : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id as string;

  const [student, setStudent] = useState<StudentFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadStudent() {
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/students/${studentId}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (res.ok) {
          const data: Student = await res.json();
          setStudent({
            name: data.name,
            parent_name: data.parent_name,
            parent_mobile: data.parent_mobile,
            alternate_mobile: data.alternate_mobile || "",
            address: data.address,
            school: data.school,
            class_name: data.class_name,
            subjects: data.subjects || [],
            joining_date: data.joining_date,
            monthly_fee: data.monthly_fee,
            notes: data.notes || "",
            profile_image: data.profile_image || "",
            batch_ids: (data.batches || []).map((b) => b.id),
          });
        } else {
          throw new Error();
        }
      } catch (err) {
        // Fallback Load from localStorage if present
        const localStr = localStorage.getItem("local_students");
        if (localStr) {
          const list: Student[] = JSON.parse(localStr);
          const found = list.find((s) => s.id === studentId);
          if (found) {
            setStudent({
              name: found.name,
              parent_name: found.parent_name,
              parent_mobile: found.parent_mobile,
              alternate_mobile: found.alternate_mobile || "",
              address: found.address,
              school: found.school,
              class_name: found.class_name,
              subjects: found.subjects || [],
              joining_date: found.joining_date,
              monthly_fee: found.monthly_fee,
              notes: found.notes || "",
              profile_image: found.profile_image || "",
              batch_ids: (found.batches || []).map((b) => b.id),
            });
          }
        }
      } finally {
        setLoading(false);
      }
    }

    if (studentId) loadStudent();
  }, [studentId]);

  const handleSubmit = async (formData: StudentFormData) => {
    setIsSubmitting(true);

    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/students/${studentId}`;
      const res = await fetch(url, {
        method: "PUT",
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
      if (localStr) {
        const list: any[] = JSON.parse(localStr);
        const idx = list.findIndex((s) => s.id === studentId);
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
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
            batches: formData.batch_ids.map((id) => ({
              id,
              name: id === "batch-1"
                ? "Batch 1 (03:00 PM - 05:00 PM)"
                : "Batch 2 (05:00 PM - 07:00 PM)",
            })),
          };
          localStorage.setItem("local_students", JSON.stringify(list));
        }
      }
      router.push("/dashboard/students");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading student details...
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 text-center italic" style={{ color: "var(--text-tertiary)" }}>
        Student profile not found.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Edit Student Profile
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Make changes to modify the student record.
        </p>
      </div>

      <StudentForm initialData={student} onSubmit={handleSubmit} isSubmitting={isSubmitting} submitButtonText="Update Profile" />
    </div>
  );
}
