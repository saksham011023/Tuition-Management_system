"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { NotificationItem, NotificationsResponse } from "./types";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  data: NotificationsResponse | null;
  loading: boolean;
  onMarkRead: () => void;
}

export default function NotificationPanel({
  isOpen,
  onClose,
  data,
  loading,
  onMarkRead,
}: NotificationPanelProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Icon mappings
  const getIcon = (type: string, color: string) => {
    const colorClasses: Record<string, { bg: string; text: string }> = {
      red: { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444" },
      green: { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981" },
      yellow: { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B" },
      blue: { bg: "rgba(59, 130, 246, 0.1)", text: "#3B82F6" },
      purple: { bg: "rgba(139, 92, 246, 0.1)", text: "#8B5CF6" },
    };
    const c = colorClasses[color] || { bg: "rgba(107, 114, 128, 0.1)", text: "#6B7280" };

    const svgPaths: Record<string, React.ReactNode> = {
      pending_fee: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
      ),
      today_class: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
      upcoming_test: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l3.75-2.25L16.5 21l-.813-5.096L20 12.25l-5.125-.747L12 6.875 9.125 11.5 4 12.25l3.563 3.654z" />
      ),
      new_admission: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V8.5a1 1 0 011-1h4l2-2h4l2 2h4zM12 11a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />
      ),
      payment: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-.621-.504-1.125-1.125-1.125H9.75M3 16.25V7.5A2.25 2.25 0 015.25 5.25h13.5A2.25 2.25 0 0121 7.5v8.75m-18 0A2.25 2.25 0 005.25 18.75h13.5A2.25 2.25 0 0021 16.25m-18 0V12m18 4.25V12m-18 0h18" />
      ),
    };

    return (
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: c.bg, color: c.text }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          {svgPaths[type] || (
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          )}
        </svg>
      </div>
    );
  };

  const handleNotificationClick = (item: NotificationItem) => {
    onClose();
    if (item.url) {
      router.push(item.url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Drawer Body */}
      <div
        ref={panelRef}
        className="relative w-full max-w-md h-full flex flex-col shadow-2xl bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 animate-in slide-in-from-right duration-250"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-850 dark:text-slate-100 text-lg">
              Notification Center
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Live alerts & recent activities
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Action strip */}
        {data && data.unread_count > 0 && (
          <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 text-xs">
            <span className="font-medium text-slate-500">
              {data.unread_count} unread notifications
            </span>
            <button
              onClick={onMarkRead}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              Mark all as read
            </button>
          </div>
        )}

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
              <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
              </svg>
              <span className="text-sm text-slate-400">Loading alerts...</span>
            </div>
          ) : (
            <>
              {/* Section 1: Alerts */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Urgent Alerts
                </h4>
                {data?.alerts && data.alerts.length > 0 ? (
                  <div className="space-y-3">
                    {data.alerts.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className="flex gap-3.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition duration-150"
                      >
                        {getIcon(item.type, item.color)}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {item.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">
                    No active notifications. All clear!
                  </p>
                )}
              </div>

              {/* Section 2: Recent Activity */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Recent Activity (Last 24h)
                </h4>
                {data?.recent_activity && data.recent_activity.length > 0 ? (
                  <div className="space-y-3">
                    {data.recent_activity.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className="flex gap-3.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition duration-150"
                      >
                        {getIcon(item.type, item.color)}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {item.message}
                          </p>
                          {item.timestamp && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 block">
                              {new Date(item.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">
                    No recent admissions or payments.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
