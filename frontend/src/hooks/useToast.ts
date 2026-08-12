import { useState, useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let toastListeners: Array<(toasts: ToastMessage[]) => void> = [];
let toasts: ToastMessage[] = [];

const notifyListeners = () => {
  toastListeners.forEach((listener) => listener([...toasts]));
};

export const showToast = (message: string, type: ToastType = "info", duration = 4000) => {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastMessage = { id, message, type };
  toasts = [...toasts, newToast];
  notifyListeners();

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  }, duration);
};

export function useToast() {
  const [currentToasts, setCurrentToasts] = useState<ToastMessage[]>(toasts);

  useEffect(() => {
    const listener = (newToasts: ToastMessage[]) => {
      setCurrentToasts(newToasts);
    };
    toastListeners.push(listener);

    const handleClose = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const id = customEvent.detail;
      toasts = toasts.filter((t) => t.id !== id);
      notifyListeners();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("tms-close-toast", handleClose);
    }

    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
      if (typeof window !== "undefined") {
        window.removeEventListener("tms-close-toast", handleClose);
      }
    };
  }, []);

  return { toasts: currentToasts, showToast };
}
export { showToast as toast };
