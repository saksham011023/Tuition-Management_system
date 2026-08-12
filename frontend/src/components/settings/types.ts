export interface TeacherProfile {
  name: string;
  email: string;
}

export interface InstituteProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface FeeDefaults {
  default_amount: number;
  currency: string;
  due_date_day: number;
}

export interface AcademicSession {
  active_session: string;
  term_name: string;
}

export interface ReceiptFormat {
  prefix: string;
  starting_number: number;
  footer_notes: string;
}

export interface SystemSettings {
  // Flat key-values stored in DB, grouped into interfaces on client
  institute_name?: string;
  institute_address?: string;
  institute_phone?: string;
  institute_email?: string;
  
  fee_default_amount?: number;
  fee_currency?: string;
  fee_due_date_day?: number;
  
  academic_session?: string;
  academic_term?: string;
  
  receipt_prefix?: string;
  receipt_start_num?: number;
  receipt_footer?: string;
  
  theme?: "light" | "dark" | "system";
  backup_auto_enabled?: boolean;
  backup_frequency?: "daily" | "weekly" | "monthly";
}
