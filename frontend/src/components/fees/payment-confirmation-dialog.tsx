"use client";

import React, { useState, useEffect } from "react";
import { generateReceiptPDF, printReceipt } from "@/lib/receipt/pdf-service";
import {
  generatePaymentReceivedMessage,
  openWhatsApp,
  copyToClipboard,
  logNotification,
  fetchBrandingSettings,
  formatMonth,
  type PaymentReceiptData,
  type BrandingSettings,
} from "@/lib/notifications/notification-service";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface PaymentConfirmationDialogProps {
  receipt: PaymentReceiptData;
  onClose: () => void;
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */

export default function PaymentConfirmationDialog({
  receipt,
  onClose,
}: PaymentConfirmationDialogProps) {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [whatsAppOpened, setWhatsAppOpened] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Load institute branding settings
  useEffect(() => {
    fetchBrandingSettings().then(setBranding);
  }, []);

  const effectiveBranding = branding || {
    institute_name: "Tuition Management System",
    institute_address: "",
    institute_phone: "",
    institute_logo_url: "",
    teacher_name: "Teacher",
    receipt_footer: "This receipt was generated digitally by TMS.",
  };

  const waMessage = generatePaymentReceivedMessage({
    ...receipt,
    instituteName: effectiveBranding.institute_name,
  });

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateReceiptPDF(receipt, effectiveBranding);
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 3000);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = async () => {
    await printReceipt(receipt, effectiveBranding);
  };

  const handleWhatsApp = async () => {
    // 1. Auto-download PDF first so teacher can attach it
    setIsGeneratingPDF(true);
    try {
      await generateReceiptPDF(receipt, effectiveBranding);
    } catch {
      // Continue even if PDF fails
    } finally {
      setIsGeneratingPDF(false);
    }

    // 2. Open WhatsApp
    openWhatsApp(receipt.parentMobile, waMessage);
    setWhatsAppOpened(true);
    setTimeout(() => setWhatsAppOpened(false), 4000);

    // 3. Log the notification event
    await logNotification({
      student_id: receipt.studentId,
      student_name: receipt.studentName,
      parent_name: receipt.parentName,
      parent_mobile: receipt.parentMobile,
      notification_type: "payment_receipt",
      channel: "whatsapp",
      status: "initiated",
      receipt_number: receipt.receiptNumber,
      message: waMessage,
      metadata: {
        amount: receipt.amount,
        month: receipt.month,
        balance: receipt.balance,
      },
    });
  };

  const handleCopyMessage = async () => {
    const success = await copyToClipboard(waMessage);
    if (success) {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 3000);
    }
  };

  const formattedMonth = formatMonth(receipt.month);
  const balanceText =
    receipt.balance > 0
      ? `₹${receipt.balance.toLocaleString("en-IN")} remaining`
      : "Fully Paid ✅";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-fade-in"
        style={{
          backgroundColor: "var(--card-bg)",
          border: "1px solid var(--card-border)",
        }}
      >
        {/* Success Header */}
        <div
          className="px-6 py-5 text-center"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/20 mx-auto mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Payment Recorded!</h2>
          <p className="text-sm text-green-100 mt-1">Receipt has been generated successfully.</p>
        </div>

        {/* Receipt Summary */}
        <div className="px-6 py-4 space-y-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-xl p-3"
              style={{ backgroundColor: "var(--background)" }}
            >
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                Amount Paid
              </p>
              <p className="text-lg font-extrabold" style={{ color: "var(--accent-success)" }}>
                ₹{receipt.amount.toLocaleString("en-IN")}
              </p>
            </div>
            <div
              className="rounded-xl p-3"
              style={{ backgroundColor: "var(--background)" }}
            >
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                Balance
              </p>
              <p
                className="text-sm font-bold"
                style={{ color: receipt.balance > 0 ? "var(--accent-danger)" : "var(--accent-success)" }}
              >
                {balanceText}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <InfoRow label="Student" value={receipt.studentName} />
            <InfoRow label="Parent" value={receipt.parentName} />
            <InfoRow label="Fee Month" value={formattedMonth} />
            <InfoRow label="Receipt No." value={receipt.receiptNumber} highlight />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
            Choose an action
          </p>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer hover:scale-[1.02] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #4f46e5, #6366f1)",
              color: "white",
              boxShadow: "0 2px 8px rgba(79,70,229,0.35)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {isGeneratingPDF ? "Generating PDF..." : downloadDone ? "✓ Downloaded!" : "Download PDF Receipt"}
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer hover:scale-[1.02] border"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--card-border)",
              color: "var(--text-primary)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
            </svg>
            Print Receipt
          </button>

          {/* WhatsApp Share */}
          <button
            onClick={handleWhatsApp}
            disabled={isGeneratingPDF || !receipt.parentMobile}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer hover:scale-[1.02] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #25d366, #128c7e)",
              color: "white",
              boxShadow: "0 2px 8px rgba(37,211,102,0.35)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12.004 2C6.484 2 2.001 6.484 2.001 12.004c0 1.948.526 3.77 1.442 5.338L2 22l4.796-1.396A9.96 9.96 0 0 0 12.004 22c5.52 0 9.996-4.484 9.996-10.004C22 6.484 17.524 2 12.004 2zm0 18.148a8.14 8.14 0 0 1-4.152-1.135l-.298-.177-3.085.898.922-3.004-.194-.307a8.083 8.083 0 0 1-1.24-4.323c0-4.483 3.647-8.13 8.13-8.13 2.172 0 4.212.845 5.745 2.38a8.075 8.075 0 0 1 2.377 5.748c-.003 4.485-3.651 8.15-8.205 8.15z" />
            </svg>
            {whatsAppOpened
              ? "✓ WhatsApp Opened! PDF downloaded — attach & send"
              : `Share via WhatsApp${receipt.parentMobile ? "" : " (No mobile)"}`}
          </button>

          {/* Copy Message */}
          <button
            onClick={handleCopyMessage}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer hover:scale-[1.02] border"
            style={{
              backgroundColor: copyDone ? "rgba(16,185,129,0.1)" : "var(--background)",
              borderColor: copyDone ? "rgba(16,185,129,0.3)" : "var(--card-border)",
              color: copyDone ? "var(--accent-success)" : "var(--text-primary)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 flex-shrink-0">
              {copyDone ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
              )}
            </svg>
            {copyDone ? "✓ Message Copied to Clipboard!" : "Copy Payment Message"}
          </button>
        </div>

        {/* Close */}
        <div className="px-6 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer hover:opacity-80"
            style={{ color: "var(--text-tertiary)" }}
          >
            Close & Return to Fees
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <span
        className="font-bold"
        style={{ color: highlight ? "var(--accent-primary)" : "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}
