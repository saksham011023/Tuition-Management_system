import { useState, useCallback } from "react";
import { useApi } from "./useApi";
import { toast } from "./useToast";

export interface FeeTransaction {
  id: string;
  amount: number;
  date: string;
  mode: "cash" | "upi" | "bank_transfer";
  receipt_number: string;
  transaction_id?: string;
  notes?: string;
}

export interface FeeRecord {
  id: string;
  student_id: string;
  student_name: string;
  month: string;
  base_amount: number;
  discount: number;
  discount_reason?: string;
  extra_charges: number;
  extra_charges_reason?: string;
  net_amount: number;
  due_date: string;
  paid_amount: number;
  balance: number;
  status: "pending" | "partially_paid" | "paid";
  notes?: string;
  transactions?: FeeTransaction[];
}

export function useFees() {
  const { fetchWithAuth } = useApi();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [total, setTotal] = useState(0);

  const fetchFees = useCallback(
    async (params: {
      page: number;
      pageSize: number;
      studentId?: string;
      month?: string;
      status?: string;
      search?: string;
    }) => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(params.page),
          page_size: String(params.pageSize),
        });

        if (params.studentId) queryParams.append("student_id", params.studentId);
        if (params.month) queryParams.append("month", params.month);
        if (params.status) queryParams.append("status", params.status);
        if (params.search) queryParams.append("search", params.search);

        const res = await fetchWithAuth(`/fees?${queryParams}`);
        if (res.ok) {
          const data = await res.json();
          setRecords(data.items);
          setTotal(data.total);
        } else {
          throw new Error("Failed to fetch fee records");
        }
      } catch (err) {
        console.error(err);
        toast("Unable to fetch fee obligations. Showing offline data.", "error");
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth]
  );

  const recordPayment = useCallback(
    async (recordId: string, paymentData: { amount: number; date: string; mode: string; transaction_id?: string; notes?: string }) => {
      setLoading(true);
      try {
        const res = await fetchWithAuth(`/fees/${recordId}/pay`, {
          method: "POST",
          json: paymentData,
        });
        if (res.ok) {
          toast("Payment successfully recorded!", "success");
          return true;
        } else {
          const errData = await res.json();
          throw new Error(errData.message || "Failed to record payment");
        }
      } catch (err: any) {
        toast(err.message || "Failed to record payment.", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth]
  );

  const generateMonthlyFees = useCallback(
    async (month: string, studentIds?: string[]) => {
      setLoading(true);
      try {
        const res = await fetchWithAuth("/fees/generate", {
          method: "POST",
          json: { month, student_ids: studentIds },
        });
        if (res.ok) {
          const data = await res.json();
          toast(`Fee records generated! Created: ${data.generated_count}, Skipped: ${data.skipped_count}`, "success");
          return true;
        } else {
          throw new Error("Failed to generate fee records");
        }
      } catch (err) {
        toast("Failed to auto-generate fees.", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth]
  );

  return {
    records,
    total,
    loading,
    fetchFees,
    recordPayment,
    generateMonthlyFees,
  };
}
