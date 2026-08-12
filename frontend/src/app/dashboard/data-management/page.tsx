"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";

type ActiveTab = "import" | "export" | "activity" | "backup" | "devtools";

interface EnvStatus {
  app_env: string;
  is_development: boolean;
  is_staging: boolean;
  is_production: boolean;
  seed_demo_enabled: boolean;
  dev_routes_enabled: boolean;
}

export default function DataManagementPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("import");
  const { showToast } = useToast();

  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);

  // Fetch Environment Status
  useEffect(() => {
    async function loadEnv() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const res = await fetch(`${apiBase}/data-management/environment`);
        if (res.ok) {
          const data = await res.json();
          setEnvStatus(data);
        }
      } catch (err) {
        console.warn("Could not fetch environment status:", err);
      }
    }
    loadEnv();
  }, []);

  // ──────────────────────────────────────────────────────────
  // TAB 1: IMPORT STATES & HANDLERS
  // ──────────────────────────────────────────────────────────
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStep, setImportStep] = useState<number>(1);
  const [validating, setValidating] = useState<boolean>(false);
  const [executingImport, setExecutingImport] = useState<boolean>(false);
  const [validationReport, setValidationReport] = useState<any>(null);
  const [duplicateHandling, setDuplicateHandling] = useState<string>("skip");
  const [importSummary, setImportSummary] = useState<any>(null);

  const handleValidateFile = async () => {
    if (!importFile) {
      showToast("Please select a CSV or Excel file to upload.", "error");
      return;
    }

    setValidating(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const res = await fetch(`${apiBase}/data-management/import/validate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setValidationReport(data);
        setImportStep(2);
        showToast(`Validated ${data.total_rows} row(s). ${data.valid_count} valid, ${data.invalid_count} error(s).`, "success");
      } else {
        const err = await res.json();
        showToast(err.detail || "Validation failed.", "error");
      }
    } catch {
      showToast("File validation error. Please check your connection.", "error");
    } finally {
      setValidating(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!validationReport || !validationReport.row_results) return;

    setExecutingImport(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");

    // Extract row_data from valid results
    const rowsToImport = validationReport.row_results
      .filter((r: any) => r.is_valid)
      .map((r: any) => r.row_data);

    try {
      const res = await fetch(`${apiBase}/data-management/import/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rows: rowsToImport,
          duplicate_handling: duplicateHandling,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setImportSummary(data);
        setImportStep(3);
        showToast(data.message, "success");
      } else {
        const err = await res.json();
        showToast(err.detail || "Import failed.", "error");
      }
    } catch {
      showToast("Import error occurred.", "error");
    } finally {
      setExecutingImport(false);
    }
  };

  const handleDownloadErrorReport = async () => {
    if (!validationReport) return;
    const invalidRows = validationReport.row_results
      .filter((r: any) => !r.is_valid)
      .map((r: any) => ({
        row: r.row_number,
        data: r.row_data,
        errors: r.errors,
      }));

    if (invalidRows.length === 0) {
      showToast("No errors to download!", "info");
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    try {
      const res = await fetch(`${apiBase}/data-management/import/error-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidRows),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "import_error_report.csv";
        a.click();
      }
    } catch {
      showToast("Could not download error report.", "error");
    }
  };

  const downloadSampleTemplate = (fmt: "csv" | "excel") => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    window.open(`${apiBase}/data-management/import/template?format=${fmt}`, "_blank");
  };

  // ──────────────────────────────────────────────────────────
  // TAB 2: EXPORT STATES & HANDLERS
  // ──────────────────────────────────────────────────────────
  const [exportFormat, setExportFormat] = useState<"csv" | "excel">("csv");
  const [exportStatus, setExportStatus] = useState<string>("all");
  const [exportSearch, setExportSearch] = useState<string>("");
  const [exporting, setExporting] = useState<boolean>(false);

  const handleExportStudents = async () => {
    setExporting(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");

    const params = new URLSearchParams({
      format: exportFormat,
      status: exportStatus,
    });
    if (exportSearch) params.append("search", exportSearch);

    try {
      const res = await fetch(`${apiBase}/data-management/export/students?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `students_export.${exportFormat === "excel" ? "xlsx" : "csv"}`;
        a.click();
        showToast("Student export downloaded successfully!", "success");
      } else {
        showToast("Export failed.", "error");
      }
    } catch {
      showToast("Could not complete export.", "error");
    } finally {
      setExporting(false);
    }
  };

  // ──────────────────────────────────────────────────────────
  // TAB 3: ACTIVITY LOG STATES & HANDLERS
  // ──────────────────────────────────────────────────────────
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [logTotal, setLogTotal] = useState<number>(0);
  const [logPage, setLogPage] = useState<number>(1);
  const [logSearch, setLogSearch] = useState<string>("");
  const [logFilterAction, setLogFilterAction] = useState<string>("");
  const [logLoading, setLogLoading] = useState<boolean>(false);
  const [selectedLogJson, setSelectedLogJson] = useState<any>(null);

  const loadActivityLogs = async (page = 1) => {
    setLogLoading(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");

    const params = new URLSearchParams({
      page: page.toString(),
      page_size: "15",
    });
    if (logSearch) params.append("search", logSearch);
    if (logFilterAction) params.append("action", logFilterAction);

    try {
      const res = await fetch(`${apiBase}/activity-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data.items || []);
        setLogTotal(data.total || 0);
        setLogPage(page);
      }
    } catch {
      console.warn("Could not load activity logs");
    } finally {
      setLogLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "activity") {
      loadActivityLogs(1);
    }
  }, [activeTab, logFilterAction]);

  // ──────────────────────────────────────────────────────────
  // TAB 4: BACKUP & RESTORE STATES & HANDLERS
  // ──────────────────────────────────────────────────────────
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [backupLoading, setBackupLoading] = useState<boolean>(false);
  const [creatingBackup, setCreatingBackup] = useState<boolean>(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState<boolean>(false);

  const loadBackupsList = async () => {
    setBackupLoading(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");

    try {
      const res = await fetch(`${apiBase}/data-management/backup`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBackupsList(data.backups || []);
      }
    } catch {
      console.warn("Could not load backups list");
    } finally {
      setBackupLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "backup") {
      loadBackupsList();
    }
  }, [activeTab]);

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");

    try {
      const res = await fetch(`${apiBase}/data-management/backup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Backup created: ${data.filename}`, "success");
        loadBackupsList();
      } else {
        showToast("Backup creation failed.", "error");
      }
    } catch {
      showToast("Error creating database backup.", "error");
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadBackupFile = (filename: string) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    window.open(`${apiBase}/data-management/backup/${filename}/download`, "_blank");
  };

  const handleRestoreBackupFile = async () => {
    if (!restoreFile) {
      showToast("Please select a .json backup file to restore.", "error");
      return;
    }

    if (!confirm("⚠️ WARNING: Restoring a backup will overwrite existing database records! Are you sure you want to proceed?")) {
      return;
    }

    setRestoring(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");

    const formData = new FormData();
    formData.append("file", restoreFile);

    try {
      const res = await fetch(`${apiBase}/data-management/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Restore complete: ${data.message}`, "success");
        setRestoreFile(null);
        loadBackupsList();
      } else {
        const err = await res.json();
        showToast(err.detail || "Backup restore failed.", "error");
      }
    } catch {
      showToast("Restore failed. Please check JSON format.", "error");
    } finally {
      setRestoring(false);
    }
  };

  // ──────────────────────────────────────────────────────────
  // TAB 5: DEV TOOLS HANDLERS
  // ──────────────────────────────────────────────────────────
  const [seeding, setSeeding] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);

  const handleGenerateDemoData = async () => {
    setSeeding(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");

    try {
      const res = await fetch(`${apiBase}/data-management/seed`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Demo Data Seeded: ${data.message}`, "success");
      } else {
        const err = await res.json();
        showToast(err.detail || "Seeding failed.", "error");
      }
    } catch {
      showToast("Error generating demo data.", "error");
    } finally {
      setSeeding(false);
    }
  };

  const handleClearDemoData = async () => {
    if (!confirm("Are you sure you want to clear all demo data (is_demo=True)?")) return;
    setClearing(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");

    try {
      const res = await fetch(`${apiBase}/data-management/seed`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message, "success");
      } else {
        const err = await res.json();
        showToast(err.detail || "Clear demo failed.", "error");
      }
    } catch {
      showToast("Error clearing demo data.", "error");
    } finally {
      setClearing(false);
    }
  };

  const handleResetDevDb = async () => {
    if (!confirm("⚠️ DANGER ZONE: This will wipe ALL students, attendance, payments, and fees from the database! Are you sure?")) return;
    setResetting(true);
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const token = localStorage.getItem("access_token") || localStorage.getItem("token");

    try {
      const res = await fetch(`${apiBase}/data-management/reset-dev-db`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message, "success");
      } else {
        const err = await res.json();
        showToast(err.detail || "Reset failed.", "error");
      }
    } catch {
      showToast("Error resetting database.", "error");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Data Management &amp; Migration
            </h2>
            {envStatus && (
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide border ${
                  envStatus.is_development
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                    : envStatus.is_staging
                    ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                }`}
              >
                {envStatus.app_env} MODE
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Import student data from handwritten notebooks via Excel/CSV, export records, manage full JSON backups, and view activity audit logs.
          </p>
        </div>
      </div>

      {/* Tabs Control */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: "import", label: "📥 Import Students", desc: "Excel & CSV Migration" },
          { id: "export", label: "📤 Export Data", desc: "Download CSV & Excel" },
          { id: "activity", label: "📋 Activity Log", desc: "Audit History" },
          { id: "backup", label: "💾 Backup & Restore", desc: "JSON Snapshots" },
          ...(envStatus?.is_development
            ? [{ id: "devtools", label: "🛠️ Dev Tools", desc: "Demo Seeding & Reset" }]
            : []),
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ──────────────────────────────────────────────────────────
          TAB 1: STUDENT IMPORT WIZARD
          ────────────────────────────────────────────────────────── */}
      {activeTab === "import" && (
        <div className="space-y-6">
          {/* Top Info Banner & Template Downloads */}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-indigo-400">Migrate Student Notebooks to Digital Platform</h3>
              <p className="text-xs text-slate-300">
                Upload your Excel (`.xlsx`) or CSV (`.csv`) sheet containing student rosters. Pre-validate records, detect duplicates, and preview before importing.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => downloadSampleTemplate("csv")}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
              >
                📄 Sample CSV
              </button>
              <button
                onClick={() => downloadSampleTemplate("excel")}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-600 transition-colors cursor-pointer"
              >
                📊 Sample Excel (.xlsx)
              </button>
            </div>
          </div>

          {/* Import Steps Progress */}
          <div className="grid grid-cols-3 gap-2 text-center border-b border-slate-800 pb-4">
            {[
              { num: 1, title: "Select File" },
              { num: 2, title: "Validate & Resolve Conflicts" },
              { num: 3, title: "Import Complete" },
            ].map((s) => (
              <div key={s.num} className="space-y-1">
                <div className={`h-1.5 rounded-full transition-all ${importStep >= s.num ? "bg-indigo-600" : "bg-slate-800"}`} />
                <span className={`text-[11px] font-bold ${importStep === s.num ? "text-indigo-400" : "text-slate-500"}`}>
                  Step {s.num}: {s.title}
                </span>
              </div>
            ))}
          </div>

          {/* STEP 1: UPLOAD & VALIDATE */}
          {importStep === 1 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center space-y-6 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center text-3xl">
                📂
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">Upload Student Roster Sheet</h4>
                <p className="text-xs text-slate-400">Supported formats: .xlsx, .xls, .csv</p>
              </div>

              <div className="p-6 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950/60 hover:border-indigo-500/50 transition-all flex flex-col items-center gap-3">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
                {importFile && (
                  <p className="text-xs font-semibold text-emerald-400">
                    Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <button
                onClick={handleValidateFile}
                disabled={!importFile || validating}
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                {validating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Parsing &amp; Validating Records...</span>
                  </>
                ) : (
                  <span>Validate File &amp; Preview Records →</span>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: PREVIEW, VALIDATION REPORT & CONFLICT RESOLUTION */}
          {importStep === 2 && validationReport && (
            <div className="space-y-6">
              {/* Validation Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Rows</span>
                  <p className="text-2xl font-extrabold text-white mt-1">{validationReport.total_rows}</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Valid Rows</span>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-1">{validationReport.valid_count}</p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-center">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Duplicates Detected</span>
                  <p className="text-2xl font-extrabold text-amber-400 mt-1">{validationReport.duplicate_count}</p>
                </div>
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Invalid Rows</span>
                  <p className="text-2xl font-extrabold text-red-400 mt-1">{validationReport.invalid_count}</p>
                </div>
              </div>

              {/* Duplicate Resolution Strategy Control */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Duplicate Resolution Strategy</h4>
                  {validationReport.invalid_count > 0 && (
                    <button
                      onClick={handleDownloadErrorReport}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-300 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 transition-colors cursor-pointer"
                    >
                      📥 Download Error Report CSV ({validationReport.invalid_count})
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "skip", title: "Skip Duplicates (Recommended)", desc: "Ignore rows that match existing parent mobile or student" },
                    { id: "merge", title: "Merge Information", desc: "Update school, address, and notes on existing record" },
                    { id: "create_anyway", title: "Create Anyway", desc: "Force create new record regardless of existing matches" },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        duplicateHandling === opt.id
                          ? "border-indigo-500 bg-indigo-600/15"
                          : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="duplicateHandling"
                          value={opt.id}
                          checked={duplicateHandling === opt.id}
                          onChange={(e) => setDuplicateHandling(e.target.value)}
                        />
                        <span className="text-xs font-bold text-white">{opt.title}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 pl-5">{opt.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rows Validation Table */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden space-y-2">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Parsed Rows &amp; Pre-Import Report</h4>
                  <span className="text-xs text-slate-400">Showing all {validationReport.row_results?.length} rows</span>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Parent Name &amp; Phone</th>
                        <th className="p-3">Class &amp; Batch</th>
                        <th className="p-3">Fee</th>
                        <th className="p-3">Validation &amp; Match Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {validationReport.row_results?.map((r: any) => (
                        <tr key={r.row_number} className={r.is_valid ? "hover:bg-slate-800/30" : "bg-red-500/10"}>
                          <td className="p-3 font-mono text-slate-500">{r.row_number}</td>
                          <td className="p-3">
                            {!r.is_valid ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                Invalid
                              </span>
                            ) : r.is_duplicate ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Duplicate Match
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Ready
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-white">{r.row_data?.student_name || "—"}</td>
                          <td className="p-3">
                            <p>{r.row_data?.parent_name || "—"}</p>
                            <p className="text-[10px] font-mono text-slate-400">{r.row_data?.parent_mobile || "—"}</p>
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-indigo-300">{r.row_data?.class || "—"}</p>
                            <p className="text-[10px] text-slate-400">{r.row_data?.batch || "—"}</p>
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-400">₹{r.row_data?.monthly_fee || 0}</td>
                          <td className="p-3 text-[11px]">
                            {r.errors?.length > 0 && (
                              <p className="text-red-400 font-semibold">{r.errors.join(", ")}</p>
                            )}
                            {r.duplicate_info && (
                              <div className="text-amber-300">
                                ⚠️ Matches: <strong>{r.duplicate_info.matched_student_name}</strong> ({r.duplicate_info.match_reason})
                              </div>
                            )}
                            {r.is_valid && !r.is_duplicate && (
                              <span className="text-slate-500">Valid record</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Navigation */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setImportStep(1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                >
                  ← Upload Different File
                </button>
                <button
                  onClick={handleExecuteImport}
                  disabled={executingImport || validationReport.valid_count === 0}
                  className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  {executingImport ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Importing Student Records...</span>
                    </>
                  ) : (
                    <span>Execute Import ({validationReport.valid_count} Records) 🚀</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: IMPORT COMPLETE */}
          {importStep === 3 && importSummary && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center space-y-6 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center text-3xl">
                ✅
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-extrabold text-white">Student Migration Complete!</h4>
                <p className="text-xs text-emerald-200">{importSummary.message}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center border-y border-emerald-500/20 py-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-300">Imported</span>
                  <p className="text-xl font-bold text-white">{importSummary.imported}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-300">Merged</span>
                  <p className="text-xl font-bold text-white">{importSummary.merged}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Skipped</span>
                  <p className="text-xl font-bold text-white">{importSummary.skipped}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setImportStep(1);
                    setImportFile(null);
                    setValidationReport(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Import Another File
                </button>
                <a
                  href="/dashboard/students"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 text-center transition-colors shadow-lg shadow-indigo-600/30"
                >
                  View Students List →
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB 2: STUDENT EXPORT
          ────────────────────────────────────────────────────────── */}
      {activeTab === "export" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6 max-w-3xl">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Export Student Roster</h3>
            <p className="text-xs text-slate-400">
              Download your student database records into Excel or CSV format while preserving active search &amp; filter selections.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Export Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as "csv" | "excel")}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="csv">CSV File (.csv)</option>
                <option value="excel">Excel Sheet (.xlsx)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Student Status Filter</label>
              <select
                value={exportStatus}
                onChange={(e) => setExportStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="all">All Students (Active + Inactive Archives)</option>
                <option value="active">Active Enrolled Students Only</option>
                <option value="inactive">Archived / Inactive Students Only</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300">Search Query Filter (Optional)</label>
              <input
                type="text"
                value={exportSearch}
                onChange={(e) => setExportSearch(e.target.value)}
                placeholder="Filter by student name, parent phone, or school..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleExportStudents}
            disabled={exporting}
            className="w-full py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Export File...</span>
              </>
            ) : (
              <span>Download {exportFormat.toUpperCase()} Student Export 📥</span>
            )}
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB 3: ACTIVITY LOG TIMELINE
          ────────────────────────────────────────────────────────── */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadActivityLogs(1)}
                placeholder="Search audit trail..."
                className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none w-full sm:w-64"
              />
              <select
                value={logFilterAction}
                onChange={(e) => setLogFilterAction(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Actions</option>
                <option value="import_completed">Imports</option>
                <option value="export_performed">Exports</option>
                <option value="backup_created">Backups</option>
                <option value="student_created">Student Created</option>
                <option value="student_updated">Student Updated</option>
                <option value="demo_seeded">Demo Seeded</option>
              </select>
            </div>
            <button
              onClick={() => loadActivityLogs(logPage)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              🔄 Refresh Trail
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Summary</th>
                    <th className="p-3.5">Performed By</th>
                    <th className="p-3.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {logLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Loading audit trail...
                      </td>
                    </tr>
                  ) : activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        No activity log entries found.
                      </td>
                    </tr>
                  ) : (
                    activityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="p-3.5 font-mono text-[11px] text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-white">{log.summary}</td>
                        <td className="p-3.5 text-slate-400">{log.performed_by}</td>
                        <td className="p-3.5">
                          {log.details ? (
                            <button
                              onClick={() => setSelectedLogJson(log.details)}
                              className="text-[11px] font-semibold text-indigo-400 hover:underline cursor-pointer"
                            >
                              View JSON
                            </button>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Total Entries: {logTotal}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={logPage <= 1}
                  onClick={() => loadActivityLogs(logPage - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  ← Prev
                </button>
                <span className="font-semibold text-white">Page {logPage}</span>
                <button
                  disabled={logPage * 15 >= logTotal}
                  onClick={() => loadActivityLogs(logPage + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          {/* JSON Modal */}
          {selectedLogJson && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Activity Details JSON</h4>
                  <button onClick={() => setSelectedLogJson(null)} className="text-slate-400 hover:text-white">
                    ✕
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto max-h-72">
                  {JSON.stringify(selectedLogJson, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB 4: BACKUP & RESTORE
          ────────────────────────────────────────────────────────── */}
      {activeTab === "backup" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Backup Box */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Create Full Application Snapshot</h3>
                <p className="text-xs text-slate-400">
                  Export all Students, Batches, Fees, Payments, Attendance, Test Scores, Settings, and Activity Logs into a single JSON backup.
                </p>
              </div>
              <button
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                {creatingBackup ? "Creating JSON Backup..." : "Create Full JSON Backup Now 💾"}
              </button>
            </div>

            {/* Restore Backup Box */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Restore Database Snapshot</h3>
                <p className="text-xs text-slate-400">
                  Upload a previously exported `.json` backup file to restore database tables.
                </p>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"
              />
              <button
                onClick={handleRestoreBackupFile}
                disabled={!restoreFile || restoring}
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                {restoring ? "Restoring Database..." : "Upload &amp; Restore Backup 🔄"}
              </button>
            </div>
          </div>

          {/* Backup File History Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden space-y-2">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Backup Files History</h4>
              <button onClick={loadBackupsList} className="text-xs text-indigo-400 hover:underline">
                Refresh History
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Filename</th>
                    <th className="p-3.5">Created At</th>
                    <th className="p-3.5">Size</th>
                    <th className="p-3.5">Record Summary</th>
                    <th className="p-3.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {backupLoading ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        Loading backup files...
                      </td>
                    </tr>
                  ) : backupsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        No backup snapshot files found in local storage.
                      </td>
                    </tr>
                  ) : (
                    backupsList.map((b) => (
                      <tr key={b.filename} className="hover:bg-slate-800/30">
                        <td className="p-3.5 font-mono text-white font-bold">{b.filename}</td>
                        <td className="p-3.5 text-slate-400">{new Date(b.created_at).toLocaleString()}</td>
                        <td className="p-3.5 font-mono">{(b.size_bytes / 1024).toFixed(1)} KB</td>
                        <td className="p-3.5 text-[11px] text-slate-400">
                          Students: {b.record_counts?.students || 0}, Fees: {b.record_counts?.fee_records || 0}
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() => handleDownloadBackupFile(b.filename)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 cursor-pointer"
                          >
                            Download JSON 📥
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB 5: DEVELOPER TOOLS (DEV MODE ONLY)
          ────────────────────────────────────────────────────────── */}
      {activeTab === "devtools" && envStatus?.is_development && (
        <div className="space-y-6 max-w-3xl">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-2">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
              🛠️ Developer Testing Utilities (Development Environment)
            </h3>
            <p className="text-xs text-slate-300">
              These utilities are enabled only because `APP_ENV=development`. They allow fast creation and cleanup of demo student data to test dashboard widgets, fee ledger calculations, attendance, and reports.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Generate Demo Data */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 mx-auto flex items-center justify-center text-xl">
                👥
              </div>
              <h4 className="text-xs font-bold text-white">Generate Demo Dataset</h4>
              <p className="text-[11px] text-slate-400">Creates 30–50 students, fee ledgers, payments, and attendance.</p>
              <button
                onClick={handleGenerateDemoData}
                disabled={seeding}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {seeding ? "Seeding..." : "Generate 40 Demo Students"}
              </button>
            </div>

            {/* Clear Demo Data */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-600/20 text-amber-400 mx-auto flex items-center justify-center text-xl">
                🧹
              </div>
              <h4 className="text-xs font-bold text-white">Clear Demo Records</h4>
              <p className="text-[11px] text-slate-400">Removes only records marked as demo (`is_demo=True`).</p>
              <button
                onClick={handleClearDemoData}
                disabled={clearing}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {clearing ? "Clearing..." : "Clear Demo Data"}
              </button>
            </div>

            {/* Reset Database */}
            <div className="rounded-2xl border border-red-500/30 bg-slate-900/60 p-5 space-y-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-400 mx-auto flex items-center justify-center text-xl">
                💣
              </div>
              <h4 className="text-xs font-bold text-red-400">Reset Dev Database</h4>
              <p className="text-[11px] text-slate-400">Completely clears all student, fee, attendance, and test records.</p>
              <button
                onClick={handleResetDevDb}
                disabled={resetting}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {resetting ? "Resetting..." : "Reset Dev Database"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
