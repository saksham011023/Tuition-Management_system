"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorState } from "./error-state";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] w-full p-6">
          <ErrorState
            title="Application Error"
            message={
              this.state.error?.message ||
              "An unexpected client-side crash occurred. We have logged the error details."
            }
            onRetry={this.handleReset}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
