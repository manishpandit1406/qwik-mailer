"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";

interface Option {
  label: React.ReactNode;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  values,
  onChange,
  placeholder = "Select options",
  className = "",
  disabled = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (optionValue: string) => {
    if (values.includes(optionValue)) {
      onChange(values.filter((v) => v !== optionValue));
    } else {
      onChange([...values, optionValue]);
    }
  };

  const removeValue = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    onChange(values.filter((v) => v !== optionValue));
  };

  const selectedOptions = options.filter((opt) => values.includes(opt.value));

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm bg-white border rounded-xl shadow-sm transition-all min-h-[42px] ${
          disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:border-gray-300 cursor-pointer"
        } ${isOpen ? "border-gray-900 ring-2 ring-gray-900/10" : "border-gray-200"}`}
      >
        <div className="flex flex-wrap gap-1.5 flex-1 pr-2">
          {selectedOptions.length === 0 ? (
            <span className="text-gray-400 py-0.5">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 text-xs font-medium border border-gray-200"
              >
                {opt.label}
                <button
                  type="button"
                  onClick={(e) => removeValue(e, opt.value)}
                  className="text-gray-500 hover:text-gray-900 focus:outline-none"
                >
                  <X size={12} />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white/90 backdrop-blur-xl border border-gray-200/60 rounded-xl shadow-xl shadow-gray-900/5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400 text-center">No options available</li>
            ) : (
              options.map((option) => {
                const isSelected = values.includes(option.value);
                return (
                  <li
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-gray-50/80 text-gray-900 font-medium"
                        : "text-gray-700 hover:bg-gray-50/80 hover:text-gray-900"
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-gray-900 border-gray-900 text-white" : "border-gray-300"}`}>
                      {isSelected && <Check size={12} />}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
