"use client";

import React from "react";
import { useToast } from "@/hooks/useToast";

export default function GlobalToastContainer() {
  const { toasts } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center justify-between p-4 rounded-xl border text-xs font-semibold shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
          style={{
            backgroundColor:
              t.type === "success" ? "#10B981" : t.type === "error" ? "#EF4444" : "#4F46E5",
            borderColor: "rgba(255, 255, 255, 0.2)",
            color: "#ffffff",
          }}
        >
          <span>{t.message}</span>
          <button
            onClick={() => {
              const event = new CustomEvent("tms-close-toast", { detail: t.id });
              window.dispatchEvent(event);
            }}
            className="ml-4 text-white/80 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
