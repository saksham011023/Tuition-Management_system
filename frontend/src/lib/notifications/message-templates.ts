/**
 * Reusable message templates for parent communications.
 * These are evaluated client-side using simple string interpolation.
 */

export type NotificationType =
  | "payment_receipt"
  | "fee_reminder"
  | "holiday"
  | "exam"
  | "attendance"
  | "performance"
  | "custom";

export interface MessageTemplate {
  key: string;
  name: string;
  type: NotificationType;
  variables: string[];
  template: string;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    key: "payment_received",
    name: "Payment Received",
    type: "payment_receipt",
    variables: ["parent_name", "student_name", "amount", "month", "receipt_number", "balance", "institute_name"],
    template:
      "Hello {parent_name},\n\n" +
      "We have successfully received *₹{amount}* for *{student_name}'s* {month} tuition fees.\n\n" +
      "📋 Receipt No: *{receipt_number}*\n" +
      "💰 Remaining Due: {balance}\n\n" +
      "Thank you for your payment! 🙏\n\n" +
      "— {institute_name}",
  },
  {
    key: "fee_reminder_upcoming",
    name: "Fee Reminder (Upcoming)",
    type: "fee_reminder",
    variables: ["parent_name", "student_name", "amount", "due_date", "month", "institute_name"],
    template:
      "Hello {parent_name},\n\n" +
      "This is a friendly reminder that the tuition fee of *₹{amount}* for *{student_name}* " +
      "({month}) is due on *{due_date}*.\n\n" +
      "Please arrange payment at your earliest convenience. 😊\n\n" +
      "— {institute_name}",
  },
  {
    key: "fee_reminder_overdue",
    name: "Fee Reminder (Overdue)",
    type: "fee_reminder",
    variables: ["parent_name", "student_name", "amount", "days_overdue", "month", "institute_name"],
    template:
      "Hello {parent_name},\n\n" +
      "⚠️ The tuition fee of *₹{amount}* for *{student_name}* ({month}) is *overdue by {days_overdue} day(s)*.\n\n" +
      "Kindly clear the dues at the earliest to avoid any disruption.\n\n" +
      "— {institute_name}",
  },
  {
    key: "holiday_notice",
    name: "Holiday Notice",
    type: "holiday",
    variables: ["parent_name", "student_name", "holiday_date", "reason", "institute_name"],
    template:
      "Hello {parent_name},\n\n" +
      "Please note that tuition classes for *{student_name}* will remain *closed* on " +
      "*{holiday_date}* due to {reason}.\n\n" +
      "Classes will resume as per normal schedule.\n\n" +
      "— {institute_name}",
  },
  {
    key: "exam_notice",
    name: "Exam / Test Notice",
    type: "exam",
    variables: ["parent_name", "student_name", "test_name", "test_date", "subjects", "institute_name"],
    template:
      "Hello {parent_name},\n\n" +
      "A *{test_name}* is scheduled for *{student_name}* on *{test_date}*.\n" +
      "Subjects: {subjects}\n\n" +
      "Please ensure your child is well prepared.\n\n" +
      "— {institute_name}",
  },
  {
    key: "attendance_alert",
    name: "Attendance Alert",
    type: "attendance",
    variables: ["parent_name", "student_name", "date", "status", "institute_name"],
    template:
      "Hello {parent_name},\n\n" +
      "*{student_name}* was marked *{status}* on *{date}* in tuition classes.\n\n" +
      "If this is an error, please contact us.\n\n" +
      "— {institute_name}",
  },
  {
    key: "custom_message",
    name: "Custom Message",
    type: "custom",
    variables: ["parent_name", "student_name", "message", "institute_name"],
    template:
      "Hello {parent_name},\n\n" +
      "{message}\n\n" +
      "— {institute_name}",
  },
];

/**
 * Render a template by replacing {variable} placeholders.
 */
export function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

/**
 * Get a template by key.
 */
export function getTemplate(key: string): MessageTemplate | undefined {
  return MESSAGE_TEMPLATES.find((t) => t.key === key);
}
