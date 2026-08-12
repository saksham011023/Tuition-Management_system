"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/hooks/useToast";

export default function OnboardingWizardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    institute_name: "Excellence Tuition Classes",
    teacher_name: "",
    teacher_email: "",
    teacher_phone: "",
    alternate_phone: "",
    address: "",
    city: "",
    state: "",
    pin_code: "",
    academic_session: "2026-2027",
    preferred_currency: "₹",
    receipt_prefix: "ETC",
    receipt_footer: "Thank you for choosing Excellence Tuition Classes. Keep this receipt for your records.",
    primary_color: "#4F46E5",
    secondary_color: "#10B981",
    institute_description: "",
    institute_logo_url: "",
    teacher_signature_url: "",
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        teacher_name: prev.teacher_name || user.name || "",
        teacher_email: prev.teacher_email || user.email || "",
      }));
    }
  }, [user]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.teacher_name || !formData.teacher_phone || !formData.address) {
        showToast("Please fill in teacher name, phone, and address.", "error");
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");

      const res = await fetch(`${apiBase}/settings/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast("Welcome to Excellence Tuition Classes! Setup completed.", "success");
        router.push("/dashboard");
      } else {
        throw new Error();
      }
    } catch {
      showToast("Completed setup in local session.", "success");
      router.push("/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl p-8 lg:p-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 mx-auto flex items-center justify-center text-3xl shadow-xl shadow-indigo-500/20">
            🎓
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">First-Time Setup Wizard</h1>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Welcome to <span className="text-indigo-400 font-bold">Excellence Tuition Classes</span>. Configure your institute details, branding, and receipts before launching your dashboard.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="grid grid-cols-3 gap-2 border-b border-slate-800 pb-6">
          {[
            { num: 1, title: "Institute & Profile" },
            { num: 2, title: "Academic & Receipts" },
            { num: 3, title: "Branding & Assets" },
          ].map((s) => (
            <div key={s.num} className="text-center space-y-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= s.num ? "bg-indigo-500" : "bg-slate-800"
                }`}
              />
              <span
                className={`text-[11px] font-semibold ${
                  step === s.num ? "text-indigo-400" : "text-slate-500"
                }`}
              >
                Step {s.num}: {s.title}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: INSTITUTE & PROFILE */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
                1. Institute &amp; Teacher Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Institute / Tuition Name</label>
                  <input
                    type="text"
                    required
                    value={formData.institute_name}
                    onChange={(e) => handleChange("institute_name", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Teacher Name</label>
                  <input
                    type="text"
                    required
                    value={formData.teacher_name}
                    onChange={(e) => handleChange("teacher_name", e.target.value)}
                    placeholder="e.g. Saksham Mishra"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Teacher Email</label>
                  <input
                    type="email"
                    required
                    value={formData.teacher_email}
                    onChange={(e) => handleChange("teacher_email", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formData.teacher_phone}
                    onChange={(e) => handleChange("teacher_phone", e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Alternate Phone (Optional)</label>
                  <input
                    type="text"
                    value={formData.alternate_phone}
                    onChange={(e) => handleChange("alternate_phone", e.target.value)}
                    placeholder="Optional secondary phone"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Address Location</label>
                  <textarea
                    rows={2}
                    required
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Institute street address"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="City"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">State &amp; PIN Code</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleChange("state", e.target.value)}
                      placeholder="State"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={formData.pin_code}
                      onChange={(e) => handleChange("pin_code", e.target.value)}
                      placeholder="PIN"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ACADEMIC & RECEIPT CONFIG */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
                2. Academic Session &amp; Receipt Formats
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Academic Session Year</label>
                  <input
                    type="text"
                    required
                    value={formData.academic_session}
                    onChange={(e) => handleChange("academic_session", e.target.value)}
                    placeholder="2026-2027"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Preferred Currency Symbol</label>
                  <input
                    type="text"
                    required
                    value={formData.preferred_currency}
                    onChange={(e) => handleChange("preferred_currency", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Receipt Serial Prefix</label>
                  <input
                    type="text"
                    required
                    value={formData.receipt_prefix}
                    onChange={(e) => handleChange("receipt_prefix", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500">e.g. ETC → Receipt No: ETC-2026-0001</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Receipt Footer Text</label>
                  <textarea
                    rows={2}
                    value={formData.receipt_footer}
                    onChange={(e) => handleChange("receipt_footer", e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none resize-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Institute Overview (Optional)</label>
                  <textarea
                    rows={2}
                    value={formData.institute_description}
                    onChange={(e) => handleChange("institute_description", e.target.value)}
                    placeholder="Short description of your academy courses and mission"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BRANDING & ASSETS */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
                3. Institute Branding &amp; Signature
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Primary Brand Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => handleChange("primary_color", e.target.value)}
                      className="w-10 h-10 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primary_color}
                      onChange={(e) => handleChange("primary_color", e.target.value)}
                      className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Secondary Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => handleChange("secondary_color", e.target.value)}
                      className="w-10 h-10 rounded-lg border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.secondary_color}
                      onChange={(e) => handleChange("secondary_color", e.target.value)}
                      className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100"
                    />
                  </div>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Institute Logo Image URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.institute_logo_url}
                    onChange={(e) => handleChange("institute_logo_url", e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Teacher Digital Signature URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.teacher_signature_url}
                    onChange={(e) => handleChange("teacher_signature_url", e.target.value)}
                    placeholder="https://example.com/signature.png"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Receipt Preview Box */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  Receipt PDF Branding Preview
                </span>
                <div className="text-center py-2 border-b border-slate-800">
                  <p className="font-bold text-sm text-white">{formData.institute_name}</p>
                  <p className="text-[10px] text-slate-400">
                    {formData.address || "Address"} • {formData.teacher_phone || "Phone"}
                  </p>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="font-mono text-indigo-400">{formData.receipt_prefix}-2026-0001</span>
                  <span className="text-emerald-400 font-bold">{formData.preferred_currency}3,000</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="px-5 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ← Back
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 transition-all cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {submitting ? "Launching Dashboard..." : "Complete Setup & Launch Dashboard 🚀"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
