"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  Calendar,
  Users,
  BarChart2,
  X,
  Copy,
  Bell,
  BellOff,
  Clock,
  ShieldCheck,
  Phone,
  FileText,
  MessageCircle,
  Mail,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import * as XLSX from "xlsx";
import { formatIST } from "@/lib/dateUtils";
import { useRole } from "@/lib/useRole";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.qwikmailer.in";
const FORMS_URL = process.env.NEXT_PUBLIC_FORMS_URL ?? "https://forms.qwikmailer.in";

function getToken() {
  return typeof window !== "undefined" ? (localStorage.getItem("mf_access_token") ?? "") : "";
}

function cleanPhoneForWhatsApp(val: any): string | null {
  if (!val) return null;
  const str = String(val).replace(/[^0-9+]/g, "").trim();
  if (!str) return null;
  // If starts with +, remove + for wa.me
  const digits = str.replace(/\+/g, "");
  if (digits.length >= 10) {
    // If 10 digits without country code, assume India (+91)
    if (digits.length === 10) return `91${digits}`;
    return digits;
  }
  return null;
}

export default function FormSubmissionsPage({ basePath = "/dashboard/forms" }: { basePath?: string }) {
  const params = useParams();
  const router = useRouter();
  const formId = (params?.id as string) || "";

  const [form, setForm] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const limit = 25;
  const [search, setSearch] = useState("");
  const [selectedSubIndex, setSelectedSubIndex] = useState<number | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "google_verified" | "with_resume">("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const { isViewer } = useRole();

  // Load Form details & submissions
  useEffect(() => {
    if (!formId) return;
    loadFormAndSubmissions();
  }, [formId, page]);

  async function loadFormAndSubmissions() {
    setLoadingList(true);
    try {
      if (!form) {
        const formRes = await fetch(`${API}/v1/forms`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const formJson = await formRes.json();
        if (formJson.success) {
          const current = formJson.data.find((f: any) => f.id === formId);
          if (current) setForm(current);
        }
      }

      const subRes = await fetch(`${API}/v1/forms/${formId}/submissions?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const subJson = await subRes.json();
      if (subJson.success) {
        setSubmissions(subJson.data || []);
        setTotalSubmissions(subJson.total ?? subJson.data?.length ?? 0);
      } else {
        setError(subJson.error || "Failed to load submissions");
      }
    } catch {
      setError("Network error while loading submissions");
    } finally {
      setLoading(false);
      setLoadingList(false);
    }
  }

  // Schema normalization
  const schema: any[] = form?.schema || [];
  const schemaLabels = schema
    .filter((f: any) => f.type !== "section")
    .map((f: any) => f.label || f.name)
    .filter(Boolean);

  const nameToLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    schema.forEach((f: any) => {
      if (f.name && f.label && f.name !== f.label) {
        map[f.name] = f.label;
      }
    });
    return map;
  }, [schema]);

  const schemaMap: Record<string, any> = useMemo(() => {
    const map: Record<string, any> = {};
    schema.forEach((f: any) => {
      if (f.label) map[f.label] = f;
      if (f.name) map[f.name] = f;
    });
    return map;
  }, [schema]);

  const rawKeySet = useMemo(() => {
    const s = new Set<string>();
    submissions.forEach((sub) => {
      Object.keys(sub.data ?? {}).forEach((k) => s.add(k));
    });
    return s;
  }, [submissions]);

  const allColumns: string[] = useMemo(() => {
    const cols: string[] = [];
    if (rawKeySet.has("Verified Google Email")) cols.push("Verified Google Email");
    if (rawKeySet.has("Google Account Name")) cols.push("Google Account Name");

    schemaLabels.forEach((lbl) => {
      if (!cols.includes(lbl)) cols.push(lbl);
    });

    rawKeySet.forEach((k) => {
      if (
        k !== "Verified Google Email" &&
        k !== "Google Account Name" &&
        !nameToLabelMap[k] &&
        !cols.includes(k)
      ) {
        cols.push(k);
      }
    });

    return cols;
  }, [rawKeySet, schemaLabels, nameToLabelMap]);

  const getSubValue = (sub: any, key: string) => {
    if (!sub?.data) return "";
    if (sub.data[key] !== undefined && sub.data[key] !== null) return sub.data[key];
    const schemaField = schema.find((f: any) => (f.label || f.name) === key);
    if (schemaField?.name && sub.data[schemaField.name] !== undefined) {
      return sub.data[schemaField.name];
    }
    return "";
  };

  // Filtered & Sorted submissions
  const filteredSubmissions = useMemo(() => {
    let list = [...submissions];

    if (filterType === "google_verified") {
      list = list.filter((s) => Boolean(s.data?.["Verified Google Email"]));
    } else if (filterType === "with_resume") {
      list = list.filter((s) => {
        return Object.values(s.data ?? {}).some(
          (v: any) =>
            (typeof v === "object" && v !== null && (v.url || v.data)) ||
            (typeof v === "string" && (v.includes("drive.google.com") || v.endsWith(".pdf")))
        );
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((sub) => {
        const dataStr = JSON.stringify(sub.data ?? {}).toLowerCase();
        const ip = (sub.ip ?? "").toLowerCase();
        return dataStr.includes(q) || ip.includes(q);
      });
    }

    if (sortOrder === "asc") {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [submissions, search, filterType, sortOrder]);

  const totalPages = Math.ceil(totalSubmissions / limit) || 1;

  // Selected Submission
  const selectedSub = selectedSubIndex !== null ? filteredSubmissions[selectedSubIndex] : null;

  // Toggle Email Notifications
  async function toggleFormAlerts() {
    const currentNotify = form?.settings?.notifyAdmin !== false;
    const nextNotify = !currentNotify;

    setForm((prev: any) => ({
      ...prev,
      settings: { ...(prev?.settings || {}), notifyAdmin: nextNotify },
    }));

    try {
      await fetch(`${API}/v1/forms/${formId}/notifications`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notifyAdmin: nextNotify }),
      });
    } catch (err) {
      console.error("Failed to toggle notification", err);
    }
  }

  // Export CSV
  async function exportCSV() {
    if (!form) return;
    setExportingCsv(true);
    try {
      const res = await fetch(`${API}/v1/forms/${formId}/submissions/export`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        alert("Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(form.name || "form").replace(/[^a-z0-9_-]/gi, "_")}_submissions.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    } finally {
      setExportingCsv(false);
    }
  }

  // Export Excel (.xlsx)
  async function exportExcel() {
    if (!form) return;
    setExportingExcel(true);
    try {
      const res = await fetch(`${API}/v1/forms/${form.id}/submissions?page=1&limit=2000`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (!json.success || !json.data || json.data.length === 0) {
        alert("No submissions to export");
        return;
      }
      const allSubs = json.data;

      const headers: string[] = ["Submitted At (IST)"];
      if (rawKeySet.has("Verified Google Email")) headers.push("Verified Google Email");
      if (rawKeySet.has("Google Account Name")) headers.push("Google Account Name");

      schemaLabels.forEach((lbl) => {
        if (!headers.includes(lbl)) headers.push(lbl);
      });

      rawKeySet.forEach((k) => {
        if (
          k !== "Verified Google Email" &&
          k !== "Google Account Name" &&
          !nameToLabelMap[k] &&
          !headers.includes(k)
        ) {
          headers.push(k);
        }
      });

      const rows = allSubs.map((sub: any) => {
        const rowObj: Record<string, any> = {};
        rowObj["Submitted At (IST)"] = formatIST(sub.createdAt, true);

        headers.forEach((h) => {
          if (h === "Submitted At (IST)") return;
          let val = sub.data?.[h];
          if (val === undefined || val === null || val === "") {
            const schemaField = schema.find((f: any) => (f.label || f.name) === h);
            if (schemaField?.name && sub.data?.[schemaField.name] !== undefined) {
              val = sub.data[schemaField.name];
            }
          }
          if (typeof val === "object" && val !== null && val.url) {
            rowObj[h] = val.url;
          } else {
            rowObj[h] = Array.isArray(val) ? val.join(", ") : (val ?? "");
          }
        });

        return rowObj;
      });

      const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Submissions");
      const safeName = (form.name || "form").replace(/[^a-z0-9_-]/gi, "_");
      XLSX.writeFile(wb, `${safeName}_submissions.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Failed to export Excel file");
    } finally {
      setExportingExcel(false);
    }
  }

  // Delete submission
  async function deleteSubmission(subId: string) {
    if (!confirm("Are you sure you want to permanently delete this submission?")) return;
    try {
      const res = await fetch(`${API}/v1/forms/${formId}/submissions/${subId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setSubmissions((prev) => prev.filter((s) => s.id !== subId));
        setTotalSubmissions((prev) => Math.max(0, prev - 1));
        if (selectedSub?.id === subId) setSelectedSubIndex(null);
      } else {
        alert(json.error ?? "Failed to delete submission");
      }
    } catch {
      alert("Network error");
    }
  }

  const formPublicUrl = form
    ? `${FORMS_URL}/f/${(form.name || "form").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}/${form.id}`
    : "";

  const conversionRate = form?.views > 0 ? ((totalSubmissions / form.views) * 100).toFixed(1) : "0.0";
  const verifiedCount = useMemo(() => {
    return submissions.filter((s) => Boolean(s.data?.["Verified Google Email"])).length;
  }, [submissions]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm animate-pulse">
          <RefreshCw size={24} className="animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900">Loading form submissions...</p>
          <p className="text-xs text-gray-400 mt-0.5">Fetching responses &amp; analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-screen bg-[#f8fafc]">
      {/* Top Banner / Breadcrumb Bar */}
      <div className="bg-white border-b border-gray-200/80 sticky top-0 z-20 backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Back & Title */}
            <div className="flex items-center gap-3.5 min-w-0">
              <Link
                href={basePath}
                className="w-9 h-9 rounded-xl bg-gray-100/80 hover:bg-gray-200/70 border border-gray-200/60 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-all shrink-0 shadow-2xs"
                title="Back to Forms"
              >
                <ArrowLeft size={16} />
              </Link>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 truncate">
                    {form?.name || "Form Submissions"}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase border ${
                      form?.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        form?.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                      }`}
                    />
                    {form?.status ?? "Active"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span>ID: <code className="font-mono text-gray-600">{form?.id?.slice(0, 8)}...</code></span>
                  <span>•</span>
                  <span>{totalSubmissions} total responses</span>
                </div>
              </div>
            </div>

            {/* Right: Actions Toolbar */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Form Links Button Group */}
              <div className="inline-flex rounded-xl bg-gray-100/80 p-0.5 border border-gray-200/80 shadow-2xs">
                <button
                  onClick={() => {
                    if (formPublicUrl) {
                      navigator.clipboard.writeText(formPublicUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-white transition-all flex items-center gap-1.5"
                  title="Copy shareable link"
                >
                  {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                </button>

                {formPublicUrl && (
                  <a
                    href={formPublicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-white transition-all flex items-center gap-1.5"
                    title="Open live public form"
                  >
                    <ExternalLink size={13} className="text-gray-500" />
                    <span>Live Form</span>
                  </a>
                )}
              </div>

              {/* Exports Button Group */}
              {!isViewer && (
                <div className="inline-flex rounded-xl bg-gray-100/80 p-0.5 border border-gray-200/80 shadow-2xs">
                  <button
                    onClick={exportCSV}
                    disabled={exportingCsv || totalSubmissions === 0}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-white transition-all flex items-center gap-1.5 disabled:opacity-50"
                    title="Export as CSV"
                  >
                    {exportingCsv ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                    <span>CSV</span>
                  </button>

                  <button
                    onClick={exportExcel}
                    disabled={exportingExcel || totalSubmissions === 0}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:bg-white transition-all flex items-center gap-1.5 disabled:opacity-50"
                    title="Export as Microsoft Excel (.xlsx)"
                  >
                    {exportingExcel ? (
                      <RefreshCw size={13} className="animate-spin text-emerald-600" />
                    ) : (
                      <FileSpreadsheet size={13} className="text-emerald-600" />
                    )}
                    <span>Excel</span>
                  </button>
                </div>
              )}

              {/* Notifications Toggle */}
              {!isViewer && (
                <button
                  onClick={toggleFormAlerts}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all shadow-2xs ${
                    form?.settings?.notifyAdmin !== false
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300/90 hover:bg-emerald-100"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}
                  title={
                    form?.settings?.notifyAdmin !== false
                      ? "Email alerts are ACTIVE on new submissions. Click to mute."
                      : "Email alerts are OFF. Click to activate."
                  }
                >
                  {form?.settings?.notifyAdmin !== false ? (
                    <>
                      <Bell size={13} className="text-emerald-600 fill-emerald-600" />
                      <span>Alerts: <strong>ON</strong></span>
                    </>
                  ) : (
                    <>
                      <BellOff size={13} className="text-gray-400" />
                      <span>Alerts: <strong>OFF</strong></span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Stat Cards Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Submissions */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Total Submissions
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Users size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {totalSubmissions.toLocaleString()}
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                {verifiedCount} Verified
              </span>
            </div>
            <div className="mt-2 text-[11px] text-gray-400">
              Unique applications received
            </div>
          </div>

          {/* Verified Views */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-blue-200 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Verified Views
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Eye size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {(form?.views ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="mt-2 text-[11px] text-gray-400">
              Form landing page visits
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-emerald-200 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Conversion Rate
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <BarChart2 size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                {conversionRate}%
              </div>
              <span className="text-xs font-semibold text-gray-500">
                submits/views
              </span>
            </div>
            {/* Progress Bar */}
            <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, Number(conversionRate) || 0))}%` }}
              />
            </div>
          </div>

          {/* Form Created */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs hover:border-amber-200 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Form Created
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Calendar size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-lg font-bold text-gray-900">
                {form?.createdAt ? formatIST(form.createdAt, false) : "—"}
              </div>
              <div className="mt-1 text-[11px] text-gray-400 flex items-center gap-1">
                <Clock size={11} />
                <span>Live on Qwik Mailer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-gray-50/80 hover:bg-gray-100/60 focus:bg-white rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-hidden text-gray-900 placeholder:text-gray-400"
              placeholder="Search across names, emails, phones, responses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 rounded-md"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Pills & Controls */}
          <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
            <div className="inline-flex rounded-xl bg-gray-100/80 p-0.5 border border-gray-200/80 text-xs">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  filterType === "all"
                    ? "bg-white text-gray-900 shadow-2xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                All ({submissions.length})
              </button>
              <button
                onClick={() => setFilterType("google_verified")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  filterType === "google_verified"
                    ? "bg-white text-emerald-800 shadow-2xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <ShieldCheck size={12} className="text-emerald-600" />
                Verified ({verifiedCount})
              </button>
              <button
                onClick={() => setFilterType("with_resume")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  filterType === "with_resume"
                    ? "bg-white text-indigo-800 shadow-2xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <FileText size={12} className="text-indigo-600" />
                Files/Resume
              </button>
            </div>

            {/* Refresh & Count */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                Showing <strong className="text-gray-900">{filteredSubmissions.length}</strong> of {totalSubmissions}
              </span>
              <button
                onClick={loadFormAndSubmissions}
                disabled={loadingList}
                className="w-8 h-8 rounded-xl border border-gray-200/80 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors"
                aria-label="Refresh submissions"
              >
                <RefreshCw size={14} className={loadingList ? "animate-spin text-indigo-600" : ""} />
              </button>
            </div>
          </div>
        </div>

        {/* Data Table Card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto min-h-[360px]">
            {loadingList ? (
              <div className="py-24 text-center">
                <RefreshCw size={26} className="animate-spin text-indigo-600 mx-auto mb-3" />
                <p className="text-xs font-semibold text-gray-600">Fetching records...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="py-24 text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <Search size={22} />
                </div>
                <h3 className="text-sm font-bold text-gray-800">No submissions found</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                  {search
                    ? `No submissions matched "${search}". Try clearing your query.`
                    : "Once respondents submit this form, all application details will appear here."}
                </p>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                    <th className="py-3 px-3.5 w-12 text-center text-gray-400 font-mono">#</th>
                    <th className="py-3 px-4 whitespace-nowrap min-w-[140px]">Submitted At</th>
                    {allColumns.map((col) => (
                      <th key={col} className="py-3 px-4 min-w-[170px] max-w-[260px] truncate">
                        {col}
                      </th>
                    ))}
                    <th className="py-3 px-4 text-center w-28 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSubmissions.map((sub, idx) => {
                    const rowNumber = (page - 1) * limit + idx + 1;
                    const phoneValue =
                      sub.data?.["PHONE / WHATSAPP NUMBER"] ||
                      sub.data?.["Phone Number"] ||
                      sub.data?.["WhatsApp"] ||
                      sub.data?.["phone"];
                    const waNumber = cleanPhoneForWhatsApp(phoneValue);

                    return (
                      <tr
                        key={sub.id}
                        onClick={() => setSelectedSubIndex(idx)}
                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                      >
                        {/* Index */}
                        <td className="py-3.5 px-3.5 text-center text-xs font-mono text-gray-400 group-hover:text-indigo-600 group-hover:font-bold">
                          {rowNumber}
                        </td>

                        {/* Submission Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {formatIST(sub.createdAt, true)}
                          </div>
                        </td>

                        {/* Dynamic Columns */}
                        {allColumns.map((col) => {
                          const val = getSubValue(sub, col);
                          const fieldDef = schemaMap[col];
                          const isColPhone =
                            col.toLowerCase().includes("phone") || col.toLowerCase().includes("whatsapp");

                          return (
                            <td key={col} className="py-3.5 px-4 max-w-[260px] truncate">
                              {/* Verified Google Email */}
                              {col === "Verified Google Email" && val ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 max-w-full">
                                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                  </svg>
                                  <span className="truncate">{String(val)}</span>
                                </span>
                              ) : /* File / PDF upload */
                              typeof val === "object" && val !== null && (val.url || val.data) && val.name ? (
                                <a
                                  href={val.url || val.data}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors"
                                >
                                  <FileText size={12} className="text-indigo-600" />
                                  <span className="truncate max-w-[130px]">{val.name}</span>
                                  <ExternalLink size={10} className="shrink-0 text-indigo-400" />
                                </a>
                              ) : /* Phone number with direct WhatsApp pill */
                              isColPhone && val && waNumber ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-900 font-mono text-xs">{String(val)}</span>
                                  <a
                                    href={`https://wa.me/${waNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shrink-0 transition-colors"
                                    title="Open chat on WhatsApp"
                                  >
                                    <MessageCircle size={11} className="fill-emerald-600 text-emerald-600" />
                                  </a>
                                </div>
                              ) : /* Rating stars */
                              fieldDef?.type === "rating" ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  <span>{"★".repeat(Math.min(5, Math.max(1, Math.round(Number(val) || 0))))}</span>
                                  <span>({val}/5)</span>
                                </span>
                              ) : /* URL link */
                              typeof val === "string" &&
                                (val.startsWith("http://") || val.startsWith("https://")) ? (
                                <a
                                  href={val}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 text-xs truncate max-w-full font-medium"
                                >
                                  <span className="truncate">{val}</span>
                                  <ExternalLink size={10} className="shrink-0" />
                                </a>
                              ) : /* Standard Text */
                              (
                                <span className="text-gray-800 text-xs block truncate">
                                  {Array.isArray(val) ? (
                                    val.join(", ")
                                  ) : val !== "" && val !== undefined && val !== null ? (
                                    String(val)
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </span>
                              )}
                            </td>
                          );
                        })}

                        {/* Row Actions */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedSubIndex(idx)}
                              className="px-2.5 py-1 text-xs font-semibold text-gray-700 hover:text-indigo-600 bg-gray-100/70 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-200/70"
                              title="View full submission details"
                            >
                              View
                            </button>
                            {!isViewer && (
                              <button
                                onClick={() => deleteSubmission(sub.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete submission"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer Bar */}
          {totalPages > 1 && (
            <div className="p-3.5 border-t border-gray-200/80 bg-gray-50/70 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">
                Page <strong className="text-gray-900">{page}</strong> of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                >
                  <ChevronLeft size={13} /> Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Detail Drawer / Modal ─────────────────────────────────────── */}
      {selectedSub && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-gray-950/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedSubIndex(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 bg-linear-to-r from-gray-50 via-white to-gray-50 flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate">
                    {selectedSub.data?.["Google Account Name"] ||
                      selectedSub.data?.["Full Name"] ||
                      selectedSub.data?.["Name"] ||
                      "Submission Detail"}
                  </h3>
                  {selectedSub.data?.["Verified Google Email"] && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck size={11} className="text-emerald-600" /> Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Submitted: <strong className="text-gray-700">{formatIST(selectedSub.createdAt, true)}</strong>
                </p>
              </div>

              {/* Prev / Next & Close */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  disabled={selectedSubIndex === 0}
                  onClick={() => setSelectedSubIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous submission"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={selectedSubIndex === filteredSubmissions.length - 1}
                  onClick={() =>
                    setSelectedSubIndex((prev) =>
                      prev !== null && prev < filteredSubmissions.length - 1 ? prev + 1 : prev
                    )
                  }
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next submission"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setSelectedSubIndex(null)}
                  className="p-1.5 ml-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                  title="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick Contact & Action Bar */}
            {(() => {
              const phoneVal =
                selectedSub.data?.["PHONE / WHATSAPP NUMBER"] ||
                selectedSub.data?.["Phone Number"] ||
                selectedSub.data?.["WhatsApp"] ||
                selectedSub.data?.["phone"];
              const emailVal =
                selectedSub.data?.["Verified Google Email"] ||
                selectedSub.data?.["Email Address"] ||
                selectedSub.data?.["Email"] ||
                selectedSub.data?.["email"];
              const wa = cleanPhoneForWhatsApp(phoneVal);

              return (
                <div className="px-6 py-2.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {wa && (
                      <a
                        href={`https://wa.me/${wa}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 shadow-2xs transition-colors"
                      >
                        <MessageCircle size={13} className="fill-white" />
                        <span>Chat on WhatsApp</span>
                      </a>
                    )}
                    {emailVal && (
                      <a
                        href={`mailto:${emailVal}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 font-semibold text-xs hover:bg-gray-50 shadow-2xs transition-colors"
                      >
                        <Mail size={13} className="text-gray-500" />
                        <span>Send Email</span>
                      </a>
                    )}
                  </div>

                  <span className="text-[11px] text-gray-400 font-mono">
                    ID: {selectedSub.id}
                  </span>
                </div>
              );
            })()}

            {/* Modal Scroll Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Google Verified Identity Card */}
              {(selectedSub.data?.["Verified Google Email"] || selectedSub.data?.["Google Account Name"]) && (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        Verified Google Identity
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        {selectedSub.data?.["Google Account Name"] || "Google Account Holder"}
                      </div>
                      <div className="text-xs font-mono text-emerald-700">
                        {selectedSub.data?.["Verified Google Email"]}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Response Fields */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Form Responses
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {allColumns
                    .filter((c) => c !== "Verified Google Email" && c !== "Google Account Name")
                    .map((col) => {
                      const val = getSubValue(selectedSub, col);
                      const fieldDef = schemaMap[col];
                      const isPhone =
                        col.toLowerCase().includes("phone") || col.toLowerCase().includes("whatsapp");
                      const wa = isPhone ? cleanPhoneForWhatsApp(val) : null;

                      return (
                        <div
                          key={col}
                          className="p-4 rounded-2xl border border-gray-200/90 bg-white hover:border-gray-300 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                              {col}
                            </span>
                            {typeof val === "string" && val.length > 0 && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(val);
                                  setCopiedField(col);
                                  setTimeout(() => setCopiedField(null), 1500);
                                }}
                                className="text-[11px] text-gray-400 hover:text-gray-700 inline-flex items-center gap-1 font-medium"
                              >
                                {copiedField === col ? (
                                  <>
                                    <Check size={11} className="text-emerald-600" /> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} /> Copy
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          <div className="text-sm text-gray-900 mt-1 whitespace-pre-wrap break-words">
                            {/* File / Resume Box */}
                            {typeof val === "object" && val !== null && (val.url || val.data) && val.name ? (
                              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-lg bg-white border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-600">
                                    <FileText size={20} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-gray-900 text-xs truncate">{val.name}</div>
                                    <div className="text-[11px] text-gray-500">{val.size || "Attached file"}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <a
                                    href={val.url || val.data}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-indigo-700 flex items-center gap-1 transition-colors shadow-2xs"
                                  >
                                    <Eye size={12} /> View
                                  </a>
                                  <a
                                    href={val.url || val.data}
                                    download={val.name}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1 transition-colors shadow-2xs"
                                  >
                                    <Download size={12} /> Download
                                  </a>
                                </div>
                              </div>
                            ) : /* Phone number with direct WhatsApp */
                            isPhone && val && wa ? (
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-base font-bold text-gray-900">{String(val)}</span>
                                <a
                                  href={`https://wa.me/${wa}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                >
                                  <MessageCircle size={12} className="fill-emerald-600 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </a>
                              </div>
                            ) : /* Rating stars */
                            fieldDef?.type === "rating" ? (
                              <div className="flex items-center gap-2 text-amber-500 text-lg">
                                {"★".repeat(Math.min(5, Math.max(1, Math.round(Number(val) || 0))))}
                                {"☆".repeat(5 - Math.min(5, Math.max(1, Math.round(Number(val) || 0))))}
                                <span className="text-xs font-semibold text-gray-600 ml-1">({val} / 5 Stars)</span>
                              </div>
                            ) : /* URL */
                            typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://")) ? (
                              <a
                                href={val}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1.5 font-medium"
                              >
                                <span>{val}</span>
                                <ExternalLink size={12} />
                              </a>
                            ) : Array.isArray(val) ? (
                              val.join(", ")
                            ) : val !== "" && val !== undefined && val !== null ? (
                              String(val)
                            ) : (
                              <span className="text-gray-400 italic">No answer provided</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Technical / Meta Info */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 space-y-1">
                {selectedSub.ip && (
                  <div>
                    <span>Submitter IP:</span> <span className="font-mono text-gray-700">{selectedSub.ip}</span>
                  </div>
                )}
                {selectedSub.userAgent && (
                  <div className="truncate">
                    <span>Client:</span> <span className="font-mono text-[11px] text-gray-600">{selectedSub.userAgent}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between shrink-0">
              {!isViewer && (
                <button
                  onClick={() => deleteSubmission(selectedSub.id)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Trash2 size={14} /> Delete Record
                </button>
              )}
              <button
                onClick={() => setSelectedSubIndex(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs ml-auto"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
