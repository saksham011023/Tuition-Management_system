"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const res = await fetch(`${apiBase}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSubmitted(true);
        showToast("Password reset instructions generated", "success");
      } else {
        throw new Error();
      }
    } catch {
      showToast("Could not process request. Try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center text-xl font-bold">
          🔑
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Forgot Password</h2>
        <p className="text-xs text-slate-400">
          Enter your registered teacher email to receive password reset instructions.
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4 text-center">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
            If your email is registered in our system, password reset instructions have been dispatched.
          </div>
          <Link
            href="/login"
            className="inline-block w-full py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Registered Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@excellence.com"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? "Sending Request..." : "Send Reset Instructions"}
          </button>

          <div className="text-center pt-2">
            <Link href="/login" className="text-xs text-slate-400 hover:text-white transition-colors">
              ← Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
