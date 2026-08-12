"use client";

import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchInputProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
  delay?: number;
}

export function SearchInput({
  onSearch,
  placeholder = "Search...",
  className = "",
  defaultValue = "",
  delay = 400,
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const debouncedValue = useDebounce(value, delay);

  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  const handleClear = () => {
    setValue("");
  };

  return (
    <div className={`relative w-full max-w-sm ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className="h-4 w-4 text-slate-400 dark:text-zinc-500" aria-hidden="true" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-8 text-sm placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-800/50 dark:placeholder:text-zinc-500 dark:focus:border-indigo-600 dark:focus:bg-zinc-900 dark:text-slate-100 transition-all"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          aria-label="Clear search input"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
