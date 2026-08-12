import { useState, useCallback } from "react";
import { useApi } from "./useApi";
import { toast } from "./useToast";

export interface Batch {
  id: string;
  name: string;
}

export interface Student {
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

export function useStudents() {
  const { fetchWithAuth } = useApi();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);

  const fetchStudents = useCallback(
    async (params: {
      page: number;
      pageSize: number;
      search?: string;
      selectedClass?: string;
      selectedBatch?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }) => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(params.page),
          page_size: String(params.pageSize),
          sort_by: params.sortBy || "name",
          sort_order: params.sortOrder || "asc",
        });

        if (params.search) queryParams.append("search", params.search);
        if (params.selectedClass) queryParams.append("class_name", params.selectedClass);
        if (params.selectedBatch) queryParams.append("batch_id", params.selectedBatch);

        const res = await fetchWithAuth(`/students?${queryParams}`);
        if (res.ok) {
          const data = await res.json();
          setStudents(data.items);
          setTotal(data.total);
        } else {
          throw new Error("Failed to fetch students");
        }
      } catch (err) {
        console.error(err);
        toast("Unable to connect to the backend server. Displaying cached records.", "error");
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth]
  );

  const deleteStudent = useCallback(
    async (id: string) => {
      try {
        const res = await fetchWithAuth(`/students/${id}`, { method: "DELETE" });
        if (res.ok) {
          toast("Student deleted successfully.", "success");
          return true;
        } else {
          throw new Error("Failed to delete student");
        }
      } catch (err) {
        toast("Failed to delete student.", "error");
        return false;
      }
    },
    [fetchWithAuth]
  );

  return {
    students,
    total,
    loading,
    fetchStudents,
    deleteStudent,
  };
}
