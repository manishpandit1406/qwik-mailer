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
  Filter,
  Copy,
  SlidersHorizontal,
} from "lucide-react";
import * as XLSX from "xlsx";
import { formatIST } from "@/lib/dateUtils";
import { useRole } from "@/lib/useRole";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const FORMS_URL = process.env.NEXT_PUBLIC_FORMS_URL ?? "https://forms.qwikmailer.in";

function getToken() {
  return typeof window !== "undefined" ? (localStorage.getItem("mf_access_token") ?? "") : "";
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
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const { isViewer } = useRole();

  // Load Form details & submissions
  useEffect(() => {
    if (!formId) return;
    loadFormAndSubmissions();
  }, [formId, page]);

  async function loadFormAndSubmissions() {
    setLoadingList(true);
    try {
      // Fetch forms list to get form metadata
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

      // Fetch paginated submissions
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
  const schemaLabels = schema.map((f: any) => f.label || f.name).filter(Boolean);
  const nameToLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    schema.forEach((f: any) => {
      if (f.name && f.label && f.name !== f.label) {
        map[f.name] = f.label;
      }
    });
    return map;
  }, [schema]);

  const rawKeySet = useMemo(() => {
    const s = new Set<string>();
    submissions.forEach(sub => {
      Object.keys(sub.data ?? {}).forEach(k => s.add(k));
    });
    return s;
  }, [submissions]);

  const allColumns: string[] = useMemo(() => {
    const cols: string[] = [];
    if (rawKeySet.has("Verified Google Email")) cols.push("Verified Google Email");
    if (rawKeySet.has("Google Account Name")) cols.push("Google Account Name");

    schemaLabels.forEach(lbl => {
      if (!cols.includes(lbl)) cols.push(lbl);
    });

    rawKeySet.forEach(k => {
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

  // Filtered submissions for search
  const filteredSubmissions = useMemo(() => {
    if (!search.trim()) return submissions;
    const q = search.toLowerCase();
    return submissions.filter(sub => {
      const dataStr = JSON.stringify(sub.data ?? {}).toLowerCase();
      const ip = (sub.ip ?? "").toLowerCase();
      return dataStr.includes(q) || ip.includes(q);
    });
  }, [submissions, search]);

  const totalPages = Math.ceil(totalSubmissions / limit) || 1;

  // Export CSV
  async function exportCSV() {
    if (!form) return;
    setExportingCsv(true);
    try {
      const res = await fetch(`${API}/v1/forms/${form.id}/submissions/export`, {
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

      schemaLabels.forEach(lbl => {
        if (!headers.includes(lbl)) headers.push(lbl);
      });

      rawKeySet.forEach(k => {
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

        headers.forEach(h => {
          if (h === "Submitted At (IST)") return;
          let val = sub.data?.[h];
          if (val === undefined || val === null || val === "") {
            const schemaField = schema.find((f: any) => (f.label || f.name) === h);
            if (schemaField?.name && sub.data?.[schemaField.name] !== undefined) {
              val = sub.data[schemaField.name];
            }
          }
          rowObj[h] = Array.isArray(val) ? val.join(", ") : (val ?? "");
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
        setSubmissions(prev => prev.filter(s => s.id !== subId));
        setTotalSubmissions(prev => Math.max(0, prev - 1));
        if (selectedSub?.id === subId) setSelectedSub(null);
      } else {
        alert(json.error ?? "Failed to delete submission");
      }
    } catch {
      alert("Network error");
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Loading form submissions...</p>
        </div>
      </div>
    );
  }

  const formPublicUrl = form
    ? `${FORMS_URL}/f/${(form.name || "form").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}/${form.id}`
    : "";

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50/50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={basePath}
              className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-black hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  {form?.name || "Form"} Submissions
                </h1>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    form?.status === "active"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-gray-100 text-gray-600 border border-gray-200"
                  }`}
                >
                  {form?.status ?? "active"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Review, filter, inspect details, and export all respondent data.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                if (formPublicUrl) {
                  navigator.clipboard.writeText(formPublicUrl);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                }
              }}
              className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 shadow-sm bg-white"
            >
              {copiedId ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copiedId ? "Copied Link!" : "Copy Form Link"}
            </button>

            {formPublicUrl && (
              <a
                href={formPublicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 shadow-sm bg-white"
              >
                <ExternalLink size={14} />
                Live Form
              </a>
            )}

            {!isViewer && (
              <>
                <button
                  onClick={exportCSV}
                  disabled={exportingCsv || totalSubmissions === 0}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 shadow-sm bg-white"
                  title="Export full submissions as CSV"
                >
                  {exportingCsv ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  Export CSV
                </button>

                <button
                  onClick={exportExcel}
                  disabled={exportingExcel || totalSubmissions === 0}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 font-semibold shadow-sm"
                  title="Export full submissions as Microsoft Excel (.xlsx)"
                >
                  {exportingExcel ? <RefreshCw size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                  Export Excel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Total Submissions</div>
              <div className="text-xl font-bold text-gray-900">{totalSubmissions.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Eye size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Verified Views</div>
              <div className="text-xl font-bold text-gray-900">{(form?.views ?? 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <BarChart2 size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Conversion Rate</div>
              <div className="text-xl font-bold text-gray-900">
                {form?.views > 0 ? `${((totalSubmissions / form.views) * 100).toFixed(1)}%` : "0.0%"}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Form Created</div>
              <div className="text-xs font-bold text-gray-900 mt-1">
                {form?.createdAt ? formatIST(form.createdAt, false) : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Search & Refresh Filter Row */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="input pl-10 pr-4 py-2 text-sm w-full bg-gray-50 border-gray-200 focus:bg-white"
              placeholder="Search across all fields, emails, responses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-xs text-gray-500">
              Showing <strong className="text-gray-900">{filteredSubmissions.length}</strong> of {totalSubmissions}
            </span>
            <button
              onClick={loadFormAndSubmissions}
              disabled={loadingList}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              title="Refresh submissions"
            >
              <RefreshCw size={15} className={loadingList ? "animate-spin text-indigo-600" : ""} />
            </button>
          </div>
        </div>

        {/* Submissions Data Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto min-h-[300px]">
            {loadingList ? (
              <div className="py-20 text-center">
                <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-3" />
                <p className="text-xs text-gray-500 font-medium">Fetching page {page}...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="py-20 text-center text-gray-500">
                <p className="text-base font-semibold text-gray-700">No submissions found</p>
                <p className="text-xs text-gray-400 mt-1">
                  {search ? "No records matched your search term." : "Once users submit your form, responses will appear here."}
                </p>
              </div>
            ) : (
              <table className="data-table w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4 whitespace-nowrap">Submitted At</th>
                    {allColumns.map(col => (
                      <th key={col} className="py-3 px-4 min-w-[160px] max-w-[240px]">
                        {col}
                      </th>
                    ))}
                    <th className="py-3 px-4 text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSubmissions.map((sub, idx) => {
                    const rowNumber = (page - 1) * limit + idx + 1;
                    return (
                      <tr
                        key={sub.id}
                        onClick={() => setSelectedSub(sub)}
                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 text-center text-xs font-mono text-gray-400 group-hover:text-indigo-600">
                          {rowNumber}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-600 whitespace-nowrap font-medium">
                          {formatIST(sub.createdAt, true)}
                        </td>

                        {allColumns.map(col => {
                          const val = getSubValue(sub, col);
                          return (
                            <td key={col} className="py-3.5 px-4 max-w-[240px] truncate">
                              {col === "Verified Google Email" && val ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 max-w-full">
                                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                  </svg>
                                  <span className="truncate">{String(val)}</span>
                                </span>
                              ) : typeof val === "object" && val !== null && val.data && val.name ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                                  <span>📄</span>
                                  <span className="truncate max-w-[140px]">{val.name}</span>
                                </span>
                              ) : (
                                <span className="text-gray-900 text-xs block truncate">
                                  {Array.isArray(val)
                                    ? val.join(", ")
                                    : val !== "" && val !== undefined && val !== null
                                      ? String(val)
                                      : <span className="text-gray-300">—</span>}
                                </span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedSub(sub)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              title="View Details"
                            >
                              <Eye size={15} />
                            </button>
                            {!isViewer && (
                              <button
                                onClick={() => deleteSubmission(sub.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete submission"
                              >
                                <Trash2 size={15} />
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

          {/* Pagination bar */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 bg-white disabled:opacity-50"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 bg-white disabled:opacity-50"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Detail Side Modal / Drawer ─────────────────────────────────── */}
      {selectedSub && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/50 backdrop-blur-sm"
          onClick={() => setSelectedSub(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Submission Details</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  ID: <span className="font-mono text-gray-700">{selectedSub.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Meta strip */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Submitted at:</span>{" "}
                  <strong className="text-gray-900">{formatIST(selectedSub.createdAt, true)}</strong>
                </div>
                {selectedSub.ip && (
                  <div>
                    <span className="text-gray-500">IP:</span>{" "}
                    <span className="font-mono text-gray-700">{selectedSub.ip}</span>
                  </div>
                )}
              </div>

              {/* Verified Identity Box if present */}
              {(selectedSub.data?.["Verified Google Email"] || selectedSub.data?.["Google Account Name"]) && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                      Verified Google Identity
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-emerald-950">
                    {selectedSub.data?.["Google Account Name"] || "Google Respondent"}
                  </div>
                  <div className="text-xs font-mono text-emerald-800">
                    {selectedSub.data?.["Verified Google Email"]}
                  </div>
                </div>
              )}

              {/* Form Schema Fields */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Form Response Fields
                </h4>
                {allColumns
                  .filter(c => c !== "Verified Google Email" && c !== "Google Account Name")
                  .map(col => {
                    const val = getSubValue(selectedSub, col);
                    return (
                      <div key={col} className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-xs">
                        <label className="block text-xs font-bold text-gray-600 mb-1">{col}</label>
                        <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                          {typeof val === "object" && val !== null && val.data && val.name ? (
                            <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-2xl">📄</span>
                                <div className="min-w-0">
                                  <div className="font-semibold text-gray-900 truncate text-xs">{val.name}</div>
                                  <div className="text-[11px] text-gray-500">{val.size || "PDF Document"}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <a
                                  href={val.data}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-white text-indigo-700 hover:bg-indigo-50"
                                >
                                  <Eye size={13} /> View PDF
                                </a>
                                <a
                                  href={val.data}
                                  download={val.name}
                                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                                >
                                  <Download size={13} /> Download
                                </a>
                              </div>
                            </div>
                          ) : Array.isArray(val)
                            ? val.join(", ")
                            : val !== "" && val !== undefined && val !== null
                              ? String(val)
                              : <span className="text-gray-400 italic">No answer provided</span>}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* User Agent */}
              {selectedSub.userAgent && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-[11px] text-gray-400 break-all font-mono">
                  {selectedSub.userAgent}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
              {!isViewer && (
                <button
                  onClick={() => deleteSubmission(selectedSub.id)}
                  className="btn-danger text-xs flex items-center gap-1.5 py-2 px-3"
                >
                  <Trash2 size={14} /> Delete Submission
                </button>
              )}
              <button
                onClick={() => setSelectedSub(null)}
                className="btn-secondary text-xs py-2 px-4 ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

