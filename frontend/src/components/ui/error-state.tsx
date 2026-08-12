import React from "react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading data. Please verify your connection and try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      className="p-8 rounded-xl border flex flex-col items-center justify-center text-center max-w-md mx-auto my-8"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 mb-4 animate-bounce">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      </div>

      <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
      <p className="text-sm mt-2 mb-6" style={{ color: "var(--text-secondary)" }}>
        {message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
          style={{ background: "var(--gradient-primary)" }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
export default ErrorState;
