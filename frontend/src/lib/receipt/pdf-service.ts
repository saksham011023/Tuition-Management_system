/**
 * Client-side PDF Receipt Generator using jsPDF.
 * Generates a professional A4-formatted payment receipt.
 * No server calls needed — runs entirely in the browser.
 */

import type { PaymentReceiptData, BrandingSettings } from "../notifications/notification-service";
import { DEFAULT_BRANDING } from "../notifications/notification-service";

// jsPDF is dynamically imported to support SSR/Next.js build
async function getJsPDF() {
  const { jsPDF } = await import("jspdf");
  await import("jspdf-autotable");
  return jsPDF;
}

function formatMode(mode: string): string {
  return mode.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatMonthFull(monthStr: string): string {
  try {
    const [year, month] = monthStr.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  } catch {
    return monthStr;
  }
}

export async function generateReceiptPDF(
  data: PaymentReceiptData,
  branding: BrandingSettings = DEFAULT_BRANDING
): Promise<void> {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // ──────────────────────────────────────────
  // COLOR PALETTE
  // ──────────────────────────────────────────
  const PRIMARY = [79, 70, 229] as [number, number, number]; // indigo-600
  const SUCCESS = [16, 185, 129] as [number, number, number]; // emerald-500
  const DARK = [15, 23, 42] as [number, number, number]; // slate-900
  const MED = [71, 85, 105] as [number, number, number]; // slate-600
  const LIGHT = [148, 163, 184] as [number, number, number]; // slate-400
  const BG_SOFT = [248, 250, 252] as [number, number, number]; // slate-50

  let y = 0;

  // ──────────────────────────────────────────
  // HEADER STRIPE
  // ──────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 32, "F");

  // Institute name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(branding.institute_name || "Excellence Tuition Classes", pageWidth / 2, 13, { align: "center" });

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(199, 210, 254); // indigo-200
  doc.text("Official Fee Payment Receipt", pageWidth / 2, 20, { align: "center" });

  if (branding.institute_address) {
    doc.setFontSize(8);
    doc.text(branding.institute_address, pageWidth / 2, 27, { align: "center" });
  }

  y = 40;

  // ──────────────────────────────────────────
  // RECEIPT META ROW
  // ──────────────────────────────────────────
  doc.setFillColor(...BG_SOFT);
  doc.roundedRect(margin, y, contentWidth, 16, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...LIGHT);
  doc.text("RECEIPT NUMBER", margin + 5, y + 5);
  doc.text("DATE", pageWidth - margin - 5, y + 5, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text(data.receiptNumber, margin + 5, y + 13);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(formatDate(data.paymentDate), pageWidth - margin - 5, y + 13, { align: "right" });

  y += 24;

  // ──────────────────────────────────────────
  // STUDENT & PAYMENT DETAILS TABLE
  // ──────────────────────────────────────────
  const rows = [
    ["Student Name", data.studentName],
    ["Parent Name", data.parentName],
    ["Class / Grade", data.className || "—"],
    ["Batch", data.batchNames.length > 0 ? data.batchNames.join(", ") : "—"],
    ["Fee Month", formatMonthFull(data.month)],
    ["Payment Mode", formatMode(data.paymentMode)],
    ...(data.transactionId ? [["Transaction ID", data.transactionId]] : []),
    ...(data.notes ? [["Notes", data.notes]] : []),
  ];

  (doc as any).autoTable({
    startY: y,
    head: [],
    body: rows,
    theme: "plain",
    columnStyles: {
      0: {
        fontStyle: "bold",
        textColor: MED,
        cellWidth: 50,
        fontSize: 9,
      },
      1: {
        textColor: DARK,
        fontSize: 10,
        fontStyle: "bold",
      },
    },
    styles: {
      cellPadding: 4,
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ──────────────────────────────────────────
  // AMOUNT BLOCK
  // ──────────────────────────────────────────
  doc.setFillColor(...SUCCESS);
  doc.roundedRect(margin, y, contentWidth, 22, 4, 4, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Amount Received", margin + 8, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`₹${data.amount.toLocaleString("en-IN")}`, pageWidth - margin - 8, y + 14, { align: "right" });

  y += 30;

  // Remaining balance
  if (data.balance > 0) {
    doc.setFillColor(254, 242, 242); // red-50
    doc.roundedRect(margin, y, contentWidth, 12, 3, 3, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(`Outstanding Balance:  ₹${data.balance.toLocaleString("en-IN")}`, margin + 6, y + 8);
    y += 18;
  } else {
    doc.setFillColor(240, 253, 244); // green-50
    doc.roundedRect(margin, y, contentWidth, 12, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(21, 128, 61); // green-700
    doc.text("✓ All dues fully cleared for this month!", margin + 6, y + 8);
    y += 18;
  }

  // ──────────────────────────────────────────
  // SIGNATURE LINE
  // ──────────────────────────────────────────
  y += 20;
  doc.setDrawColor(...LIGHT);
  doc.line(margin, y, margin + 50, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MED);
  doc.text(branding.teacher_name || "Authorized Signatory", margin, y + 5);

  // Future QR placeholder
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...LIGHT);
  doc.text(`Verify at: /verify/receipt/${data.receiptNumber}`, pageWidth - margin, y, { align: "right" });

  // ──────────────────────────────────────────
  // FOOTER
  // ──────────────────────────────────────────
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...PRIMARY);
  doc.rect(0, pageHeight - 14, pageWidth, 14, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(199, 210, 254);
  doc.text(
    branding.receipt_footer || "This receipt was generated digitally by TMS.",
    pageWidth / 2,
    pageHeight - 6,
    { align: "center" }
  );

  // ──────────────────────────────────────────
  // SAVE
  // ──────────────────────────────────────────
  doc.save(`Receipt_${data.receiptNumber}.pdf`);
}

export async function printReceipt(data: PaymentReceiptData, branding: BrandingSettings = DEFAULT_BRANDING): Promise<void> {
  // Open a print-optimized window
  const win = window.open("", "_blank", "width=700,height=900");
  if (!win) return;

  const formattedMonth = formatMonthFull(data.month);
  const balanceText = data.balance > 0 ? `₹${data.balance.toLocaleString("en-IN")}` : "₹0 (Fully Paid ✅)";

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Receipt - ${data.receiptNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #0f172a; background: white; }
        .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
        .header h1 { font-size: 20px; margin-bottom: 4px; }
        .header p { font-size: 11px; color: #c7d2fe; }
        .content { padding: 24px; }
        .meta-row { display: flex; justify-content: space-between; background: #f8fafc; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; }
        .label { font-size: 9px; text-transform: uppercase; color: #94a3b8; font-weight: bold; }
        .value { font-size: 13px; font-weight: bold; }
        .receipt-no { color: #4f46e5; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        td { padding: 7px 4px; font-size: 11px; border-bottom: 1px solid #f1f5f9; }
        td:first-child { color: #475569; font-weight: bold; width: 140px; }
        td:last-child { color: #0f172a; font-weight: bold; }
        .amount-block { background: #10b981; color: white; border-radius: 8px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .amount-block .label { color: rgba(255,255,255,0.8); font-size: 10px; }
        .amount-block .big { font-size: 22px; font-weight: bold; }
        .balance-block { background: #fef2f2; color: #b91c1c; border-radius: 6px; padding: 8px 12px; font-size: 10px; margin-bottom: 20px; }
        .paid-block { background: #f0fdf4; color: #15803d; border-radius: 6px; padding: 8px 12px; font-size: 10px; margin-bottom: 20px; font-weight: bold; }
        .sig-row { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 10px; }
        .sig-line { width: 120px; border-top: 1px solid #94a3b8; padding-top: 4px; font-size: 9px; color: #64748b; }
        .verify { font-size: 9px; color: #94a3b8; }
        .footer { background: #4f46e5; color: #c7d2fe; text-align: center; font-size: 8px; padding: 8px; margin-top: 20px; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${branding.institute_name}</h1>
        <p>Official Fee Payment Receipt</p>
        ${branding.institute_address ? `<p style="font-size:9px;margin-top:2px;">${branding.institute_address}</p>` : ""}
      </div>
      <div class="content">
        <div class="meta-row">
          <div><div class="label">Receipt Number</div><div class="value receipt-no">${data.receiptNumber}</div></div>
          <div style="text-align:right"><div class="label">Payment Date</div><div class="value">${formatDate(data.paymentDate)}</div></div>
        </div>
        <table>
          <tr><td>Student Name</td><td>${data.studentName}</td></tr>
          <tr><td>Parent Name</td><td>${data.parentName}</td></tr>
          <tr><td>Class / Grade</td><td>${data.className || "—"}</td></tr>
          <tr><td>Batch</td><td>${data.batchNames.length > 0 ? data.batchNames.join(", ") : "—"}</td></tr>
          <tr><td>Fee Month</td><td>${formattedMonth}</td></tr>
          <tr><td>Payment Mode</td><td>${formatMode(data.paymentMode)}</td></tr>
          ${data.transactionId ? `<tr><td>Transaction ID</td><td>${data.transactionId}</td></tr>` : ""}
          ${data.notes ? `<tr><td>Notes</td><td>${data.notes}</td></tr>` : ""}
        </table>
        <div class="amount-block">
          <div><div class="label">Amount Received</div></div>
          <div class="big">₹${data.amount.toLocaleString("en-IN")}</div>
        </div>
        ${
          data.balance > 0
            ? `<div class="balance-block">Outstanding Balance: ₹${data.balance.toLocaleString("en-IN")}</div>`
            : `<div class="paid-block">✓ All dues fully cleared for this month!</div>`
        }
        <div class="sig-row">
          <div class="sig-line">${branding.teacher_name || "Authorized Signatory"}</div>
          <div class="verify">Verify: /verify/receipt/${data.receiptNumber}</div>
        </div>
      </div>
      <div class="footer">${branding.receipt_footer}</div>
      <script>window.onload = () => { window.print(); }<\/script>
    </body>
    </html>
  `);
  win.document.close();
}
