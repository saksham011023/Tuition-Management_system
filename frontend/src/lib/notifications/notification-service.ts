/**
 * Provider-agnostic Notification Service (frontend).
 *
 * Architecture is designed so future providers (WhatsApp Business API, SMS, Email)
 * can be swapped in without changing any business logic.
 */

import { renderTemplate } from "./message-templates";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token") || localStorage.getItem("token")
      : null;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface PaymentReceiptData {
  studentId: string;
  studentName: string;
  parentName: string;
  parentMobile: string;
  className: string;
  batchNames: string[];
  month: string; // YYYY-MM
  amount: number;
  balance: number;
  receiptNumber: string;
  paymentDate: string;
  paymentMode: string;
  transactionId?: string | null;
  notes?: string | null;
  instituteName?: string;
}

export interface FeeReminderData {
  studentId: string;
  studentName: string;
  parentName: string;
  parentMobile: string;
  amount: number;
  month: string;
  dueDate: string;
  daysOverdue?: number;
  instituteName?: string;
}

// ──────────────────────────────────────────────
// WhatsApp Click-to-Chat (free, no API key)
// ──────────────────────────────────────────────

/**
 * Generate a WhatsApp Click-to-Chat URL.
 * Future: swap this function body with WhatsApp Business API call.
 */
export function generateWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.startsWith("91") || digits.length !== 10 ? digits : `91${digits}`;
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${withCountryCode}?text=${encoded}`;
}

/**
 * Open WhatsApp with a pre-filled message.
 */
export function openWhatsApp(phone: string, message: string): void {
  const url = generateWhatsAppUrl(phone, message);
  window.open(url, "_blank");
}

// ──────────────────────────────────────────────
// Message generation
// ──────────────────────────────────────────────

export function generatePaymentReceivedMessage(data: PaymentReceiptData): string {
  const formattedMonth = formatMonth(data.month);
  const balanceText = data.balance > 0 ? `₹${data.balance.toLocaleString("en-IN")}` : "₹0 (Fully Paid ✅)";
  return renderTemplate(
    "Hello {parent_name},\n\n" +
      "We have successfully received *₹{amount}* for *{student_name}'s* {month} tuition fees.\n\n" +
      "📋 Receipt No: *{receipt_number}*\n" +
      "💰 Remaining Due: {balance}\n\n" +
      "Thank you for your payment! 🙏\n\n" +
      "— {institute_name}",
    {
      parent_name: data.parentName,
      student_name: data.studentName,
      amount: data.amount.toLocaleString("en-IN"),
      month: formattedMonth,
      receipt_number: data.receiptNumber,
      balance: balanceText,
      institute_name: data.instituteName || "Tuition Centre",
    }
  );
}

export function generateFeeReminderMessage(data: FeeReminderData): string {
  const formattedMonth = formatMonth(data.month);
  if (data.daysOverdue && data.daysOverdue > 0) {
    return renderTemplate(
      "Hello {parent_name},\n\n" +
        "⚠️ The tuition fee of *₹{amount}* for *{student_name}* ({month}) is *overdue by {days_overdue} day(s)*.\n\n" +
        "Kindly clear the dues at the earliest to avoid any disruption.\n\n" +
        "— {institute_name}",
      {
        parent_name: data.parentName,
        student_name: data.studentName,
        amount: data.amount.toLocaleString("en-IN"),
        month: formattedMonth,
        days_overdue: String(data.daysOverdue),
        institute_name: data.instituteName || "Tuition Centre",
      }
    );
  }
  return renderTemplate(
    "Hello {parent_name},\n\n" +
      "This is a friendly reminder that the tuition fee of *₹{amount}* for *{student_name}* " +
      "({month}) is due on *{due_date}*.\n\n" +
      "Please arrange payment at your earliest convenience. 😊\n\n" +
      "— {institute_name}",
    {
      parent_name: data.parentName,
      student_name: data.studentName,
      amount: data.amount.toLocaleString("en-IN"),
      month: formattedMonth,
      due_date: data.dueDate,
      institute_name: data.instituteName || "Tuition Centre",
    }
  );
}

// ──────────────────────────────────────────────
// Clipboard
// ──────────────────────────────────────────────

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for non-secure contexts
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    return true;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────
// Backend notification logging
// ──────────────────────────────────────────────

export async function logNotification(payload: {
  student_id: string;
  student_name: string;
  parent_name: string;
  parent_mobile: string;
  notification_type: string;
  channel: string;
  status: string;
  receipt_number?: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await fetch(`${API_BASE}/notifications`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-critical — don't block the user flow if notification logging fails
    console.warn("Could not log notification to backend.");
  }
}

// ──────────────────────────────────────────────
// Settings helpers
// ──────────────────────────────────────────────

export interface BrandingSettings {
  institute_name: string;
  institute_address: string;
  institute_phone: string;
  institute_logo_url: string;
  teacher_name: string;
  receipt_footer: string;
}

export const DEFAULT_BRANDING: BrandingSettings = {
  institute_name: "Excellence Tuition Classes",
  institute_address: "Near Main Market, Station Road",
  institute_phone: "",
  institute_logo_url: "",
  teacher_name: "Teacher",
  receipt_footer: "Thank you for choosing Excellence Tuition Classes. Keep this receipt for your records.",
};

export async function fetchBrandingSettings(): Promise<BrandingSettings> {
  try {
    const res = await fetch(`${API_BASE}/settings`, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      // Settings come as key-value pairs
      const map: Record<string, string> = {};
      if (Array.isArray(data)) {
        data.forEach((item: { key: string; value: string }) => {
          map[item.key] = item.value;
        });
      } else if (typeof data === "object") {
        Object.assign(map, data);
      }
      return {
        institute_name: map.institute_name || DEFAULT_BRANDING.institute_name,
        institute_address: map.institute_address || DEFAULT_BRANDING.institute_address,
        institute_phone: map.institute_phone || DEFAULT_BRANDING.institute_phone,
        institute_logo_url: map.institute_logo_url || DEFAULT_BRANDING.institute_logo_url,
        teacher_name: map.teacher_name || DEFAULT_BRANDING.teacher_name,
        receipt_footer: map.receipt_footer || DEFAULT_BRANDING.receipt_footer,
      };
    }
  } catch {
    // Silently use defaults
  }
  return DEFAULT_BRANDING;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

export function formatMonth(monthStr: string): string {
  try {
    const [year, month] = monthStr.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  } catch {
    return monthStr;
  }
}
