import { useState, useCallback } from "react";
import { useApi } from "./useApi";
import { toast } from "./useToast";

export interface AttendanceRecord {
  student_id: string;
  student_name?: string;
  status: "present" | "absent" | "leave";
  remarks?: string;
}

export function useAttendance() {
  const { fetchWithAuth } = useApi();
  const [loading, setLoading] = useState(false);

  const markAttendance = useCallback(
    async (batchId: string, date: string, records: AttendanceRecord[]) => {
      setLoading(true);
      try {
        const res = await fetchWithAuth(`/attendance/mark?batch_id=${batchId}&date=${date}`, {
          method: "POST",
          json: records,
        });
        if (res.ok) {
          toast("Attendance marked successfully!", "success");
          return true;
        } else {
          throw new Error("Failed to mark attendance");
        }
      } catch (err) {
        toast("Failed to mark attendance sheet.", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth]
  );

  return {
    loading,
    markAttendance,
  };
}
