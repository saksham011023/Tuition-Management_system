"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/lib/validators/auth";
import { useAuth } from "@/lib/auth/auth-context";

export default function RegisterPage() {
  const { register: signup, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await signup(data);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg =
        (typeof detail === "object" ? detail?.message : detail) ||
        e?.response?.data?.message ||
        "Registration failed. Email may already be registered.";
      setFormError(typeof msg === "string" ? msg : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
      {/* Left Column — Education Showcase */}
      <div className="lg:col-span-5 p-8 lg:p-12 flex flex-col justify-between relative bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border-r border-slate-800/80">
        <div className="absolute top-0 left-0 w-full h-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30 text-white font-extrabold">
              🎓
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
                Excellence Tuition Classes
              </h1>
              <p className="text-xs text-indigo-300 font-medium">Academy Management Suite</p>
            </div>
          </div>

          <div className="pt-6 space-y-3">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              ✨ Fast Onboarding Setup
            </span>
            <h2 className="text-2xl font-bold text-white leading-snug">
              Register as a Teacher to manage your classes.
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Create your teacher account in seconds. Once registered, configure your institute branding, logo, signature, and fee receipt defaults.
            </p>
          </div>
        </div>

        <div className="relative z-10 pt-8 space-y-3 border-t border-indigo-500/20">
          {[
            { icon: "⚡", text: "Instant Account Activation" },
            { icon: "🔒", text: "Secure JWT Token Authentication" },
            { icon: "📋", text: "Customizable Institute Branding" },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 text-xs text-indigo-200">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-sm">
                {item.icon}
              </span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column — Register Form */}
      <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-slate-900/60">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Teacher Registration</h3>
            <p className="text-xs text-slate-400 mt-1">
              Set up your teacher profile credentials.
            </p>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium flex items-center justify-between animate-in fade-in duration-200">
              <span>⚠️ {formError}</span>
              <button
                onClick={() => setFormError(null)}
                className="text-red-400 hover:text-red-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-semibold text-slate-300">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                {...register("name")}
                className={`w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-950/70 text-slate-100 placeholder-slate-500 ${
                  errors.name
                    ? "border-red-500 focus:ring-red-500/30"
                    : "border-slate-800 focus:border-indigo-500"
                }`}
                placeholder="e.g. Saksham Mishra"
              />
              {errors.name && (
                <p className="text-xs text-red-400 font-medium">{errors.name.message}</p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
                className={`w-full rounded-xl border px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-950/70 text-slate-100 placeholder-slate-500 ${
                  errors.email
                    ? "border-red-500 focus:ring-red-500/30"
                    : "border-slate-800 focus:border-indigo-500"
                }`}
                placeholder="teacher@excellence.com"
              />
              {errors.email && (
                <p className="text-xs text-red-400 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("password")}
                  className={`w-full rounded-xl border px-4 py-3 pr-10 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-950/70 text-slate-100 placeholder-slate-500 ${
                    errors.password
                      ? "border-red-500 focus:ring-red-500/30"
                      : "border-slate-800 focus:border-indigo-500"
                  }`}
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {submitting || loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Register &amp; Begin Setup</span>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="pt-4 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Already have a teacher account?{" "}
              <Link
                href="/login"
                className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
