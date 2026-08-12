"""
PDF export service using ReportLab.
Generates clean, branded PDF documents for each report type.
"""

import io
from datetime import date

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from src.reports.schemas import (
    AttendanceReport,
    BatchReport,
    FeeCollectionReport,
    MonthlySummaryReport,
    PendingFeesReport,
    StudentPerformanceReport,
)

# ── Colour palette ──────────────────────────────────────────────────────────
PRIMARY = colors.HexColor("#4F46E5")      # Indigo
PRIMARY_LIGHT = colors.HexColor("#EEF2FF")
ACCENT = colors.HexColor("#10B981")       # Green
DANGER = colors.HexColor("#EF4444")
WARNING = colors.HexColor("#F59E0B")
NEUTRAL = colors.HexColor("#6B7280")
HEADER_BG = colors.HexColor("#1E1B4B")   # Dark indigo
ROW_ALT = colors.HexColor("#F8FAFC")


def _build_doc(buffer: io.BytesIO, title: str, landscape_mode: bool = False) -> SimpleDocTemplate:
    page_size = landscape(A4) if landscape_mode else A4
    doc = SimpleDocTemplate(
        buffer,
        pagesize=page_size,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=title,
        author="Tuition Management System",
    )
    return doc


def _styles():
    s = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=s["Title"],
        fontSize=20,
        textColor=PRIMARY,
        spaceAfter=4,
        fontName="Helvetica-Bold",
        alignment=TA_LEFT,
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=s["Normal"],
        fontSize=10,
        textColor=NEUTRAL,
        spaceAfter=16,
        fontName="Helvetica",
    )
    section_style = ParagraphStyle(
        "SectionHeader",
        parent=s["Heading2"],
        fontSize=12,
        textColor=PRIMARY,
        spaceBefore=12,
        spaceAfter=6,
        fontName="Helvetica-Bold",
    )
    return title_style, subtitle_style, section_style


def _table_header_style(num_cols: int, has_totals_row: bool = False) -> TableStyle:
    base = [
        # Header row style
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]
    return TableStyle(base)


def _status_color(status: str) -> colors.Color:
    return {
        "paid": ACCENT,
        "partially_paid": WARNING,
        "pending": DANGER,
    }.get(status, NEUTRAL)


def _currency(value: float) -> str:
    return f"₹{value:,.0f}"


def _pct(value: float) -> str:
    return f"{value:.1f}%"


# ══════════════════════════════════════════════════════════════════════════════
# Fee Collection PDF
# ══════════════════════════════════════════════════════════════════════════════

def generate_fee_collection_pdf(report: FeeCollectionReport) -> bytes:
    buffer = io.BytesIO()
    doc = _build_doc(buffer, "Fee Collection Report", landscape_mode=True)
    title_s, sub_s, sec_s = _styles()
    story = []

    story.append(Paragraph("Fee Collection Report", title_s))
    story.append(Paragraph(
        f"Period: {report.start_date} to {report.end_date}  ·  Generated: {date.today()}",
        sub_s,
    ))

    # KPI summary row
    kpi_data = [
        ["Total Expected", "Collected", "Pending", "Collection Rate", "Paid", "Partial", "Pending Count"],
        [
            _currency(report.total_expected),
            _currency(report.total_collected),
            _currency(report.total_pending),
            _pct(report.collection_rate),
            str(report.paid_count),
            str(report.partially_paid_count),
            str(report.pending_count),
        ],
    ]
    kpi_table = Table(kpi_data, colWidths=[3.8 * cm] * 7)
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("BACKGROUND", (0, 1), (-1, 1), PRIMARY_LIGHT),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (-1, 1), 10),
        ("TEXTCOLOR", (0, 1), (-1, 1), PRIMARY),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.white),
        ("BOX", (0, 0), (-1, -1), 1, PRIMARY),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 0.5 * cm))

    # By mode breakdown
    story.append(Paragraph("Payment Mode Breakdown", sec_s))
    mode_data = [["Mode", "Amount Collected"]]
    for mode, amount in report.by_mode.items():
        mode_data.append([mode.replace("_", " ").title(), _currency(amount)])
    mode_table = Table(mode_data, colWidths=[5 * cm, 4 * cm])
    mode_table.setStyle(_table_header_style(2))
    story.append(mode_table)
    story.append(Spacer(1, 0.4 * cm))

    # Detailed records
    story.append(Paragraph("Detailed Records", sec_s))
    col_headers = ["Student", "Class", "Month", "Base Amt", "Discount", "Extra", "Net Amt", "Paid", "Balance", "Status"]
    detail_data = [col_headers]
    for row in report.rows:
        detail_data.append([
            row.student_name,
            row.class_name,
            row.month,
            _currency(row.base_amount),
            _currency(row.discount),
            _currency(row.extra_charges),
            _currency(row.net_amount),
            _currency(row.paid_amount),
            _currency(row.balance),
            row.status.replace("_", " ").title(),
        ])
    col_widths = [4.5, 2.2, 2.2, 2.5, 2.2, 2.0, 2.5, 2.5, 2.5, 2.8]
    detail_table = Table(detail_data, colWidths=[w * cm for w in col_widths])
    style = _table_header_style(len(col_headers))
    # Color status column
    for i, row in enumerate(report.rows, start=1):
        c = _status_color(row.status)
        style.add("TEXTCOLOR", (9, i), (9, i), c)
        style.add("FONTNAME", (9, i), (9, i), "Helvetica-Bold")
    detail_table.setStyle(style)
    story.append(detail_table)

    doc.build(story)
    return buffer.getvalue()


# ══════════════════════════════════════════════════════════════════════════════
# Pending Fees PDF
# ══════════════════════════════════════════════════════════════════════════════

def generate_pending_fees_pdf(report: PendingFeesReport) -> bytes:
    buffer = io.BytesIO()
    doc = _build_doc(buffer, "Pending Fees Report")
    title_s, sub_s, sec_s = _styles()
    story = []

    story.append(Paragraph("Pending Fees Report", title_s))
    story.append(Paragraph(
        f"As of: {report.as_of_date}  ·  Total Outstanding: {_currency(report.total_pending_amount)}  ·  Records: {report.total_records}",
        sub_s,
    ))

    headers = ["Student", "Class", "Month", "Net Amount", "Paid", "Balance", "Due Date", "Days Overdue", "Status"]
    data = [headers]
    for row in report.rows:
        data.append([
            row.student_name,
            row.class_name,
            row.month,
            _currency(row.net_amount),
            _currency(row.paid_amount),
            _currency(row.balance),
            str(row.due_date),
            str(row.days_overdue),
            row.status.replace("_", " ").title(),
        ])
    col_widths = [4.5, 2.0, 2.2, 2.5, 2.5, 2.5, 2.5, 2.5, 2.8]
    table = Table(data, colWidths=[w * cm for w in col_widths])
    style = _table_header_style(len(headers))
    for i, row in enumerate(report.rows, start=1):
        if row.days_overdue > 30:
            style.add("BACKGROUND", (0, i), (-1, i), colors.HexColor("#FEF2F2"))
        c = _status_color(row.status)
        style.add("TEXTCOLOR", (8, i), (8, i), c)
        style.add("FONTNAME", (8, i), (8, i), "Helvetica-Bold")
    table.setStyle(style)
    story.append(table)

    doc.build(story)
    return buffer.getvalue()


# ══════════════════════════════════════════════════════════════════════════════
# Attendance PDF
# ══════════════════════════════════════════════════════════════════════════════

def generate_attendance_pdf(report: AttendanceReport) -> bytes:
    buffer = io.BytesIO()
    doc = _build_doc(buffer, "Attendance Report", landscape_mode=True)
    title_s, sub_s, sec_s = _styles()
    story = []

    story.append(Paragraph("Attendance Report", title_s))
    story.append(Paragraph(
        f"Period: {report.start_date} to {report.end_date}  ·  Overall Rate: {_pct(report.overall_rate)}  ·  Total Sessions: {report.total_sessions}",
        sub_s,
    ))

    # Student summary table
    story.append(Paragraph("Student-wise Summary", sec_s))
    headers = ["Student", "Class", "Batch", "Sessions", "Present", "Absent", "Leave", "Attendance %"]
    data = [headers]
    for row in report.student_rows:
        data.append([
            row.student_name,
            row.class_name,
            row.batch_name or "—",
            str(row.total_sessions),
            str(row.present),
            str(row.absent),
            str(row.leave),
            _pct(row.attendance_percentage),
        ])
    col_widths = [5, 2.5, 3.5, 2.2, 2.2, 2.2, 2.2, 2.8]
    table = Table(data, colWidths=[w * cm for w in col_widths])
    style = _table_header_style(len(headers))
    for i, row in enumerate(report.student_rows, start=1):
        color = ACCENT if row.attendance_percentage >= 75 else DANGER
        style.add("TEXTCOLOR", (7, i), (7, i), color)
        style.add("FONTNAME", (7, i), (7, i), "Helvetica-Bold")
    table.setStyle(style)
    story.append(table)
    story.append(Spacer(1, 0.5 * cm))

    # Daily summary table
    story.append(Paragraph("Daily Summary", sec_s))
    d_headers = ["Date", "Batch", "Total Students", "Present", "Absent", "Leave", "Rate"]
    d_data = [d_headers]
    for row in report.daily_rows:
        d_data.append([
            str(row.date),
            row.batch_name or "All Batches",
            str(row.total_students),
            str(row.present),
            str(row.absent),
            str(row.leave),
            _pct(row.attendance_rate),
        ])
    d_col_widths = [3, 3.5, 3.5, 2.2, 2.2, 2.2, 2.8]
    d_table = Table(d_data, colWidths=[w * cm for w in d_col_widths])
    d_table.setStyle(_table_header_style(len(d_headers)))
    story.append(d_table)

    doc.build(story)
    return buffer.getvalue()


# ══════════════════════════════════════════════════════════════════════════════
# Student Performance PDF
# ══════════════════════════════════════════════════════════════════════════════

def generate_student_performance_pdf(report: StudentPerformanceReport) -> bytes:
    buffer = io.BytesIO()
    doc = _build_doc(buffer, "Student Performance Report", landscape_mode=True)
    title_s, sub_s, sec_s = _styles()
    story = []

    story.append(Paragraph("Student Performance Report", title_s))
    story.append(Paragraph(
        f"Period: {report.start_date} to {report.end_date}  ·  Students: {len(report.rows)}",
        sub_s,
    ))

    headers = ["Student", "Class", "Tests", "Avg Score", "Highest", "Lowest", "Attendance %", "Outstanding"]
    data = [headers]
    for row in report.rows:
        data.append([
            row.student_name,
            row.class_name,
            str(row.total_tests),
            _pct(row.avg_score_percentage),
            _pct(row.highest_score_percentage),
            _pct(row.lowest_score_percentage),
            _pct(row.attendance_percentage),
            _currency(row.outstanding_balance),
        ])
    col_widths = [5, 2.5, 2, 2.5, 2.5, 2.5, 3, 3]
    table = Table(data, colWidths=[w * cm for w in col_widths])
    style = _table_header_style(len(headers))
    for i, row in enumerate(report.rows, start=1):
        score_color = ACCENT if row.avg_score_percentage >= 60 else DANGER
        att_color = ACCENT if row.attendance_percentage >= 75 else DANGER
        bal_color = DANGER if row.outstanding_balance > 0 else ACCENT
        style.add("TEXTCOLOR", (3, i), (3, i), score_color)
        style.add("TEXTCOLOR", (6, i), (6, i), att_color)
        style.add("TEXTCOLOR", (7, i), (7, i), bal_color)
    table.setStyle(style)
    story.append(table)

    doc.build(story)
    return buffer.getvalue()


# ══════════════════════════════════════════════════════════════════════════════
# Batch Report PDF
# ══════════════════════════════════════════════════════════════════════════════

def generate_batch_pdf(report: BatchReport) -> bytes:
    buffer = io.BytesIO()
    doc = _build_doc(buffer, "Batch Report", landscape_mode=True)
    title_s, sub_s, sec_s = _styles()
    story = []

    story.append(Paragraph("Batch Report", title_s))
    story.append(Paragraph(
        f"Period: {report.start_date} to {report.end_date}  ·  Batches: {len(report.rows)}",
        sub_s,
    ))

    headers = ["Batch", "Subject", "Teacher", "Days", "Timing", "Students", "Capacity", "Att. Rate", "Collected", "Pending"]
    data = [headers]
    for row in report.rows:
        data.append([
            row.batch_name,
            row.subject,
            row.teacher,
            ", ".join(row.days[:3]),
            row.timing,
            str(row.total_students),
            str(row.max_students),
            _pct(row.attendance_rate),
            _currency(row.total_fee_collected),
            _currency(row.total_fee_pending),
        ])
    col_widths = [3.5, 2.8, 3, 2.8, 3, 2, 2.2, 2.5, 2.8, 2.8]
    table = Table(data, colWidths=[w * cm for w in col_widths])
    table.setStyle(_table_header_style(len(headers)))
    story.append(table)

    doc.build(story)
    return buffer.getvalue()


# ══════════════════════════════════════════════════════════════════════════════
# Monthly Summary PDF
# ══════════════════════════════════════════════════════════════════════════════

def generate_monthly_summary_pdf(report: MonthlySummaryReport) -> bytes:
    buffer = io.BytesIO()
    doc = _build_doc(buffer, "Monthly Summary Report", landscape_mode=True)
    title_s, sub_s, sec_s = _styles()
    story = []

    story.append(Paragraph("Monthly Summary Report", title_s))
    story.append(Paragraph(
        f"Period: {report.start_date} to {report.end_date}  ·  Months: {len(report.rows)}",
        sub_s,
    ))

    headers = ["Month", "Active Students", "Sessions", "Avg Att. %", "Expected", "Collected", "Pending", "Coll. Rate", "Tests"]
    data = [headers]
    for row in report.rows:
        data.append([
            row.month,
            str(row.active_students),
            str(row.total_sessions),
            _pct(row.avg_attendance_rate),
            _currency(row.fees_expected),
            _currency(row.fees_collected),
            _currency(row.fees_pending),
            _pct(row.collection_rate),
            str(row.tests_conducted),
        ])
    col_widths = [2.5, 3, 2.5, 2.8, 3, 3, 2.8, 2.8, 2]
    table = Table(data, colWidths=[w * cm for w in col_widths])
    style = _table_header_style(len(headers))
    for i, row in enumerate(report.rows, start=1):
        cr_color = ACCENT if row.collection_rate >= 80 else (WARNING if row.collection_rate >= 50 else DANGER)
        style.add("TEXTCOLOR", (7, i), (7, i), cr_color)
    table.setStyle(style)
    story.append(table)

    doc.build(story)
    return buffer.getvalue()
