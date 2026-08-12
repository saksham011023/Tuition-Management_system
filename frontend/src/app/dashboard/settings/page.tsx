"use client";

import React, { useState, useEffect } from "react";
import type { SystemSettings } from "@/components/settings/types";

type ActiveTab = "profile" | "institute" | "fees" | "academic" | "receipt" | "theme" | "backup";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("profile");
  const [settings, setSettings] = useState<SystemSettings>({
    institute_name: "Excellence Tuition Classes",
    institute_address: "Near Main Market, Station Road",
    institute_phone: "+91 9876543210",
    institute_email: "contact@excellence.com",
    fee_default_amount: 3000,
    fee_currency: "₹",
    fee_due_date_day: 10,
    academic_session: "2026-2027",
    academic_term: "Full Year Course",
    receipt_prefix: "ETC",
    receipt_start_num: 1000,
    receipt_footer: "Thank you for choosing Excellence Tuition Classes. Keep this receipt for your records.",
    theme: "system",
    backup_auto_enabled: true,
    backup_frequency: "weekly",
  });

  // Profile Form States
  const [profileName, setProfileName] = useState("Teacher Account");
  const [profileEmail, setProfileEmail] = useState("teacher@tms.com");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Authenticate silently and load settings
  useEffect(() => {
    async function loadSettings() {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");

      if (token) {
        try {
          // Fetch settings
          const res = await fetch(`${apiBase}/settings`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            // Merge defaults with loaded settings
            setSettings((prev) => ({ ...prev, ...data }));
          }

          // Fetch profile
          const userRes = await fetch(`${apiBase}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            setProfileName(userData.name || "");
            setProfileEmail(userData.email || "");
          }
        } catch (err) {
          console.warn("Could not load real settings from backend. Running in demo mode.");
        }
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  const showStatus = (text: string, type: "success" | "error") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");

    try {
      if (token) {
        const res = await fetch(`${apiBase}/settings`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ settings }),
        });
        if (res.ok) {
          showStatus("Configuration saved successfully!", "success");
        } else {
          throw new Error();
        }
      } else {
        // Mock success in demo mode
        showStatus("Configuration saved successfully (Demo Mode)!", "success");
      }
    } catch (err) {
      showStatus("Failed to save configuration settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      showStatus("Passwords do not match!", "error");
      return;
    }

    setSaving(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");

    try {
      if (token) {
        const res = await fetch(`${apiBase}/settings/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: profileName,
            email: profileEmail,
            password: newPassword || null,
          }),
        });
        if (res.ok) {
          showStatus("Teacher profile updated successfully!", "success");
          setNewPassword("");
          setConfirmPassword("");
        } else {
          const errMsg = await res.text();
          throw new Error(errMsg);
        }
      } else {
        showStatus("Profile updated successfully (Demo Mode)!", "success");
      }
    } catch (err: any) {
      showStatus(err.message || "Failed to update profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerBackup = async () => {
    setSaving(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");

    try {
      if (token) {
        const res = await fetch(`${apiBase}/settings/backup`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          showStatus(`Backup created: ${data.backup_path}`, "success");
        } else {
          throw new Error();
        }
      } else {
        showStatus("Database backup triggered (Demo Mode)!", "success");
      }
    } catch (err) {
      showStatus("Failed to create database backup.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadExport = async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");

    try {
      if (token) {
        const res = await fetch(`${apiBase}/settings/export`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "tms_database_export.db";
          document.body.appendChild(a);
          a.click();
          a.remove();
          showStatus("Database exported successfully!", "success");
        } else {
          throw new Error();
        }
      } else {
        showStatus("Database export download only supported with active server connection.", "error");
      }
    } catch (err) {
      showStatus("Failed to export database.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading settings panel...
        </div>
      </div>
    );
  }

  const tabs: { id: ActiveTab; label: string; desc: string }[] = [
    { id: "profile", label: "Teacher Profile", desc: "Manage password and credentials" },
    { id: "institute", label: "Institute Profile", desc: "Academy identity and contacts" },
    { id: "fees", label: "Fee Defaults", desc: "Billing cycle and currency symbol" },
    { id: "academic", label: "Academic Session", desc: "Active academic term settings" },
    { id: "receipt", label: "Receipt Format", desc: "Billing prefixes and receipt footer text" },
    { id: "theme", label: "Application Theme", desc: "Personalize layout themes" },
    { id: "backup", label: "Backups & Exports", desc: "Secure database file operations" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Settings
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
          Customize default parameters, formatting schemas, profile credentials, and system backups.
        </p>
      </div>

      {/* Status Notifications (Fixed Toast Alert) */}
      {statusMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 p-4 rounded-xl border text-sm font-semibold shadow-2xl animate-in slide-in-from-bottom-6 duration-250"
          style={{
            backgroundColor: statusMessage.type === "success" ? "#10B981" : "#EF4444",
            borderColor: statusMessage.type === "success" ? "#10B98140" : "#EF444440",
            color: "#ffffff",
            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
          }}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Main Settings Section */}
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        {/* Navigation Sidebar Tabs */}
        <div className="flex flex-col gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col text-left p-3.5 rounded-xl transition duration-150 ${
                  isActive
                    ? "bg-indigo-50 dark:bg-slate-800 border-l-4 border-indigo-500"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                }`}
              >
                <span
                  className="text-sm font-bold"
                  style={{ color: isActive ? "#4F46E5" : "var(--text-primary)" }}
                >
                  {tab.label}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                  {tab.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents Card */}
        <div
          className="rounded-2xl border p-6"
          style={{ borderColor: "var(--card-border)", backgroundColor: "var(--card-bg)" }}
        >
          {/* TAB 1: TEACHER PROFILE */}
          {activeTab === "profile" && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Teacher Profile Settings
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none focus:ring-2 focus:ring-indigo-500/20"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Email Address</label>
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none focus:ring-2 focus:ring-indigo-500/20"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: "var(--card-border)" }}>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">New Password (optional)</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none focus:ring-2 focus:ring-indigo-500/20"
                      style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none focus:ring-2 focus:ring-indigo-500/20"
                      style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="mt-4 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
              >
                {saving ? "Saving Profile..." : "Update Profile"}
              </button>
            </form>
          )}

          {/* TAB 2: INSTITUTE PROFILE */}
          {activeTab === "institute" && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Institute Profile
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Institute Name</label>
                  <input
                    type="text"
                    required
                    value={settings.institute_name || ""}
                    onChange={(e) => setSettings({ ...settings, institute_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none focus:ring-2 focus:ring-indigo-500/20"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Contact Number</label>
                  <input
                    type="text"
                    required
                    value={settings.institute_phone || ""}
                    onChange={(e) => setSettings({ ...settings, institute_phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Official Email</label>
                  <input
                    type="email"
                    required
                    value={settings.institute_email || ""}
                    onChange={(e) => setSettings({ ...settings, institute_email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Address Location</label>
                  <textarea
                    rows={2}
                    value={settings.institute_address || ""}
                    onChange={(e) => setSettings({ ...settings, institute_address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none resize-none"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition"
              >
                Save Details
              </button>
            </form>
          )}

          {/* TAB 3: FEE DEFAULTS */}
          {activeTab === "fees" && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Fee Configurations
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Default Monthly Fee</label>
                  <input
                    type="number"
                    required
                    value={settings.fee_default_amount || 0}
                    onChange={(e) => setSettings({ ...settings, fee_default_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Currency Symbol</label>
                  <select
                    value={settings.fee_currency || "₹"}
                    onChange={(e) => setSettings({ ...settings, fee_currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none bg-white dark:bg-slate-900"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  >
                    <option value="₹">₹ (INR)</option>
                    <option value="$">$ (USD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-500">Due Date Day (Monthly billing cycle)</label>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    required
                    value={settings.fee_due_date_day || 10}
                    onChange={(e) => setSettings({ ...settings, fee_due_date_day: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition"
              >
                Save Defaults
              </button>
            </form>
          )}

          {/* TAB 4: ACADEMIC SESSION */}
          {activeTab === "academic" && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Academic Session
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Active Session Year</label>
                  <input
                    type="text"
                    required
                    value={settings.academic_session || ""}
                    onChange={(e) => setSettings({ ...settings, academic_session: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Active Term / Semester Name</label>
                  <input
                    type="text"
                    required
                    value={settings.academic_term || ""}
                    onChange={(e) => setSettings({ ...settings, academic_term: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition"
              >
                Save Session
              </button>
            </form>
          )}

          {/* TAB 5: RECEIPT FORMAT + BRANDING */}
          {activeTab === "receipt" && (
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Billing & Receipt Formats
                </h3>
                <p className="text-xs mt-0.5 text-slate-400">
                  These settings control the PDF receipt layout and WhatsApp notification branding.
                </p>
              </div>

              {/* Receipt Number Format */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Receipt Numbering</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Receipt Invoice Prefix</label>
                    <input
                      type="text"
                      required
                      value={settings.receipt_prefix || ""}
                      onChange={(e) => setSettings({ ...settings, receipt_prefix: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none"
                      style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                    />
                    <p className="text-[10px] text-slate-400">e.g., TMS → Receipt No: TMS-2026-0001</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Starting Serial Number</label>
                    <input
                      type="number"
                      required
                      value={settings.receipt_start_num || 1000}
                      onChange={(e) => setSettings({ ...settings, receipt_start_num: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none"
                      style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>
              </div>

              {/* PDF Branding */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">PDF Receipt Branding</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Authorized Signatory Name</label>
                    <input
                      type="text"
                      value={(settings as any).teacher_name || ""}
                      onChange={(e) => setSettings({ ...settings, ...(settings as any), teacher_name: e.target.value } as any)}
                      placeholder="e.g., Ravi Sharma"
                      className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none"
                      style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                    />
                    <p className="text-[10px] text-slate-400">Appears on receipt as authorized signatory</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Institute Logo URL (optional)</label>
                    <input
                      type="url"
                      value={(settings as any).institute_logo_url || ""}
                      onChange={(e) => setSettings({ ...settings, ...(settings as any), institute_logo_url: e.target.value } as any)}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none"
                      style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-500">Receipt Footer Text</label>
                    <textarea
                      rows={2}
                      value={settings.receipt_footer || ""}
                      onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                      placeholder="Thank you for your payment. Keep this receipt for your records."
                      className="w-full px-3 py-2 rounded-xl border text-sm bg-transparent outline-none resize-none"
                      style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div
                className="rounded-xl border p-4 space-y-1"
                style={{ backgroundColor: "var(--background)", borderColor: "var(--card-border)" }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Receipt Preview</p>
                <div className="text-center py-3 border-b" style={{ borderColor: "var(--card-border)" }}>
                  <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                    {settings.institute_name || "Institute Name"}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Official Fee Payment Receipt</p>
                  <p className="text-[9px]" style={{ color: "var(--text-tertiary)" }}>
                    {settings.institute_address || "Address"} • {settings.institute_phone || "Phone"}
                  </p>
                </div>
                <div className="pt-2 flex justify-between items-center text-[10px]">
                  <span className="font-mono text-indigo-500">{settings.receipt_prefix || "TMS"}-2026-0001</span>
                  <span style={{ color: "var(--text-tertiary)" }}>Today's Date</span>
                </div>
                <div className="flex justify-between text-[10px] pt-1">
                  <span style={{ color: "var(--text-secondary)" }}>Student Name</span>
                  <span className="font-bold" style={{ color: "var(--text-primary)" }}>₹1,500</span>
                </div>
                <div className="pt-2 border-t flex justify-between text-[9px]" style={{ borderColor: "var(--card-border)" }}>
                  <span style={{ color: "var(--text-tertiary)" }}>{(settings as any).teacher_name || "Authorized Signatory"}</span>
                  <span style={{ color: "var(--text-tertiary)" }}>{settings.receipt_footer?.slice(0, 40) || "Footer text"}…</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition"
              >
                {saving ? "Saving..." : "Save Receipt Branding"}
              </button>
            </form>
          )}

          {/* TAB 6: THEME SETTINGS */}
          {activeTab === "theme" && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Application Theme Mode
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {(["light", "dark", "system"] as const).map((t) => {
                    const isSelected = settings.theme === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSettings({ ...settings, theme: t })}
                        className={`p-4 rounded-xl border text-center font-bold text-sm transition capitalize ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50/50 dark:bg-slate-850 text-indigo-600 dark:text-indigo-400"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/20"
                        }`}
                        style={{
                          borderColor: isSelected ? "#4F46E5" : "var(--card-border)",
                          color: isSelected ? undefined : "var(--text-primary)",
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition"
              >
                Save Theme Choice
              </button>
            </form>
          )}

          {/* TAB 7: BACKUP AND EXPORTS */}
          {activeTab === "backup" && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Database Backup &amp; Export Utilities
              </h3>
              
              {/* SQLite Direct Download */}
              <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: "var(--card-border)" }}>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Export System Database
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                  Download a binary export copy of the SQLite database (`tms.db`). This file contains all students, batches, payments ledger entries, and attendance records.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadExport}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download SQLite DB Export
                </button>
              </div>

              {/* Trigger local backup */}
              <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: "var(--card-border)" }}>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Manual Backup Run
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                  Trigger an immediate backup copy of the database. Backup copies are stored locally on the server in `./backups/` directory.
                </p>
                <button
                  type="button"
                  onClick={handleTriggerBackup}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Trigger Database Backup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
