export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    REFRESH: "/auth/refresh",
    ME: "/auth/me",
  },
  USERS: {
    PROFILE: "/users/me",
  },
  DASHBOARD: {
    BASE: "/dashboard",
    NOTIFICATIONS: "/dashboard/notifications",
  },
  STUDENTS: {
    BASE: "/students",
    DETAIL: (id: string) => `/students/${id}`,
  },
  BATCHES: {
    BASE: "/batches",
    DETAIL: (id: string) => `/batches/${id}`,
    STUDENTS: (id: string) => `/batches/${id}/students`,
  },
  FEES: {
    BASE: "/fees",
    DETAIL: (id: string) => `/fees/${id}`,
    COLLECT: (id: string) => `/fees/${id}/collect`,
    STUDENT_HISTORY: (studentId: string) => `/fees/student/${studentId}`,
  },
  ATTENDANCE: {
    BASE: "/attendance",
    BATCH: (batchId: string) => `/attendance/batch/${batchId}`,
  },
  REPORTS: {
    BASE: "/reports",
    EXPORT_PDF: "/reports/export/pdf",
    EXPORT_EXCEL: "/reports/export/excel",
  },
  SEARCH: {
    GLOBAL: "/search",
  },
  SETTINGS: {
    BASE: "/settings",
  },
};
