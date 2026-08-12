"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SearchCategory, SearchResult, SearchResponse } from "./types";
import SearchResultItem from "./search-result-item";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { value: SearchCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "students", label: "Students" },
  { value: "batches", label: "Batches" },
  { value: "fees", label: "Fees" },
  { value: "payments", label: "Payments" },
  { value: "attendance", label: "Attendance" },
];

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search trigger
  useEffect(() => {
    if (!isOpen) return;

    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [query, category, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setQuery("");
      setResults([]);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle outside click
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Keybindings (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[activeIndex]) {
          handleSelectResult(results[activeIndex]);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, activeIndex]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const params = new URLSearchParams();
      params.set("q", query);
      params.set("category", category);

      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const res = await fetch(`${API}/search?${params.toString()}`, { headers });

      if (res.ok) {
        const data: SearchResponse = await res.json();
        setResults(data.results);
        setActiveIndex(0);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Failed to perform search:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    onClose();
    router.push(result.url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      {/* Glassmorphism Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[6px] transition-opacity" />

      {/* Modal Dialog */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col bg-white dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200"
        style={{
          borderColor: "var(--card-border)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        }}
      >
        {/* Search Input Box */}
        <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: "var(--card-border)" }}>
          <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search students, parents, classes, phone numbers, receipt numbers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-0 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 text-base"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b overflow-x-auto scrollbar-none" style={{ borderColor: "var(--card-border)" }}>
          {CATEGORIES.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setCategory(tab.value)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                category === tab.value
                  ? "bg-indigo-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto max-h-[50vh] p-3 space-y-1">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
              </svg>
              <span className="text-sm text-slate-400">Searching the ledger...</span>
            </div>
          )}

          {!loading && results.length > 0 && (
            results.map((res, idx) => (
              <SearchResultItem
                key={res.id}
                result={res}
                active={idx === activeIndex}
                onSelect={() => handleSelectResult(res)}
              />
            ))
          )}

          {!loading && results.length === 0 && query.trim() !== "" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No results found</p>
              <p className="text-xs text-slate-400 mt-1">Try searching with name, receipt, or phone number.</p>
            </div>
          )}

          {query.trim() === "" && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-slate-500">
              <kbd className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 font-sans shadow-sm mb-3">
                Ctrl + K / ⌘K
              </kbd>
              <p className="text-xs">Type a keyword to start searching all database tables.</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2.5 border-t bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between text-[10px] text-slate-400" style={{ borderColor: "var(--card-border)" }}>
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-sans border px-1.5 py-0.5 rounded bg-white shadow-sm dark:bg-slate-800">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="font-sans border px-1.5 py-0.5 rounded bg-white shadow-sm dark:bg-slate-800">Enter</kbd> Open
            </span>
            <span>
              <kbd className="font-sans border px-1.5 py-0.5 rounded bg-white shadow-sm dark:bg-slate-800">Esc</kbd> Close
            </span>
          </div>
          <span>TMS Global Search</span>
        </div>
      </div>
    </div>
  );
}
