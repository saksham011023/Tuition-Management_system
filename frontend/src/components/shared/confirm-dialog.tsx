"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  variant?: "danger" | "warning" | "info";
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
  variant = "danger",
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const colorMap = {
    danger: "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400",
    warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400",
    info: "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400",
  };

  const buttonColorMap = {
    danger: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
    warning: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
    info: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-w-md w-full backdrop:bg-black/50 backdrop:backdrop-blur-sm animate-fade-in"
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorMap[variant]}`}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonColorMap[variant]}`}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
