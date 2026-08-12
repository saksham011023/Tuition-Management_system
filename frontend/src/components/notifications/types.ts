export interface NotificationItem {
  id: string;
  type: "pending_fee" | "today_class" | "upcoming_test" | "new_admission" | "payment";
  title: string;
  message: string;
  icon: string;
  color: "red" | "green" | "yellow" | "blue" | "purple";
  url?: string;
  timestamp?: string;
  meta: Record<string, any>;
}

export interface NotificationsResponse {
  total: number;
  unread_count: number;
  alerts: NotificationItem[];
  recent_activity: NotificationItem[];
}
