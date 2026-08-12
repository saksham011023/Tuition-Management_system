"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { NotificationsResponse } from "./types";
import NotificationPanel from "./notification-panel";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastReadTime, setLastReadTime] = useState<string | null>(null);

  // Load last read timestamp from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("notifications_last_read");
    if (stored) {
      setLastReadTime(stored);
    }
  }, []);

  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const res = await fetch(`${API}/dashboard/notifications`, { headers });

      if (res.ok) {
        const result: NotificationsResponse = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Poll for notifications every 60s
  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllRead = () => {
    const now = new Date().toISOString();
    localStorage.setItem("notifications_last_read", now);
    setLastReadTime(now);
    if (data) {
      setData({
        ...data,
        unread_count: 0,
      });
    }
  };

  // Determine unread count depending on local read status
  const unreadCount = data ? data.unread_count : 0;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
        aria-label="Notifications Center"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="w-5 h-5 text-slate-500 dark:text-slate-400"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] font-bold text-white items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      <NotificationPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        data={data}
        loading={loading}
        onMarkRead={handleMarkAllRead}
      />
    </>
  );
}
