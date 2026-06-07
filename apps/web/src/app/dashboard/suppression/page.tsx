"use client";
import { formatIST } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Trash2,
  Search,
  Plus,
  CheckCircle2,
  Ban,
  RefreshCw,
} from "lucide-react";
import { Select } from "@/components/Select";
import { LogoLoader } from "@/components/LogoLoader";
import { useRole } from "@/lib/useRole";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
interface SuppressionItem {
  id: string;
  email: string;
  type: string;
  reason: string;
  addedAt: string;
}
function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("mf_access_token") ?? "")
    : "";
}
export default function SuppressionPage() {
  const [items, setItems] = useState<SuppressionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newType, setNewType] = useState("unsubscribe");
  const [newReason, setNewReason] = useState("");
  const [adding, setAdding] = useState(false);
  const { isViewer } = useRole();
  const limit = 15;
  
  const tabs = [
    { id: "all", label: "All Suppressions" },
    { id: "bounce", label: "Bounces" },
    { id: "spam_report", label: "Spam Reports" },
    { id: "block", label: "Blocks" },
    { id: "invalid", label: "Invalid Emails" },
    { id: "unsubscribe", label: "Unsubscribes" },
  ] as const;
  const [activeTab, setActiveTab] = useState<string>("all");

  async function fetchSuppressionList(pageNum = 1, searchQuery = "", tabType = activeTab) {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
        type: tabType,
      });
      if (searchQuery.trim()) {
        q.append("search", searchQuery.trim());
      }
      const res = await fetch(`${API}/v1/suppression-list?${q.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setTotal(json.data.total);
        setHasMore(json.data.hasMore);
        setPage(pageNum);
      } else {
        setError(json.error ?? "Failed to load suppression list.");
      }
    } catch {
      setError("Network error. Failed to load suppression list.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchSuppressionList(1, search, activeTab);
  }, [activeTab]);
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchSuppressionList(1, search);
  }
  async function handleAddSuppression() {
    if (!newEmail.trim()) return;
    setAdding(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(`${API}/v1/suppression-list`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: newEmail.trim(), type: newType, reason: newReason }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Successfully suppressed ${newEmail.trim()}`);
        setNewEmail("");
        setNewType("unsubscribe");
        setNewReason("");
        setShowAdd(false);
        fetchSuppressionList(1, search, activeTab);
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setError(json.error ?? "Failed to add email to suppression list.");
      }
    } catch {
      setError("Network error. Failed to add email.");
    } finally {
      setAdding(false);
    }
  }
  async function handleRemoveSuppression(email: string) {
    if (
      !confirm(
        `Are you sure you want to remove ${email} from the suppression list?`,
      )
    )
      return;
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(
        `${API}/v1/suppression-list/${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Successfully removed ${email}`);
        fetchSuppressionList(page, search);
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setError(json.error ?? "Failed to remove email.");
      }
    } catch {
      setError("Network error. Failed to remove email.");
    }
  }
  return (
    <div className="space-y-5 ">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Suppression List
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            View and manage emails that are blocked due to bounces, complaints,
            or manual unsubscribes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost p-2"
            title="Refresh"
            onClick={() => fetchSuppressionList(page, search)}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          {!isViewer && (
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => setShowAdd(true)}
            >
              <Plus size={14} /> Suppress Email
            </button>
          )}
        </div>
      </div>
      {/* Success/Error banners */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          {error}
          <button
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-600 ml-2"
          >
            ✕
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" /> {successMsg}
          </span>
          <button
            onClick={() => setSuccessMsg("")}
            className="text-emerald-400 hover:text-emerald-600 ml-2"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b" style={{ borderColor: "var(--border)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
              activeTab === t.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent hover:text-gray-900 dark:hover:text-gray-100"
            }`}
            style={activeTab !== t.id ? { color: "var(--text-secondary)" } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Search Bar */}
      <div className="glass-card p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className="input pl-10"
              placeholder="Search by email address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-secondary px-5 py-2.5">
            Search
          </button>
          {search && (
            <button
              type="button"
              className="btn-ghost px-3 py-2.5"
              onClick={() => {
                setSearch("");
                fetchSuppressionList(1, "");
              }}
            >
              Clear
            </button>
          )}
        </form>
      </div>
      {/* List Table */}
      <div className="glass-card overflow-hidden">
        {loading && items.length === 0 ? (
          <LogoLoader fullPage text="Loading suppression list..." />
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Ban size={32} className="mx-auto mb-3 text-gray-300" />
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              No suppressed emails found
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Emails will appear here if they bounce or if you manually add
              them.
            </p>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Blocked Email</th>
                  <th>Type</th>
                  <th>Reason (Optional)</th>
                  <th>Blocked Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td
                      className="font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldAlert size={14} className="text-red-500" />
                        {item.email}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.type === "bounce" ? "bg-amber-100 text-amber-700" : item.type === "spam_report" ? "bg-red-100 text-red-700" : item.type === "block" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700"}`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">
                      {item.reason || "-"}
                    </td>
                    <td className="text-xs">
                      {formatIST(item.addedAt, false)}
                    </td>
                    <td>
                      {!isViewer && (
                        <button
                          className="btn-ghost p-1.5 text-red-400 hover:text-red-600 flex items-center gap-1 text-xs"
                          title="Remove Suppression"
                          onClick={() => handleRemoveSuppression(item.email)}
                        >
                          <Trash2 size={13} /> Unblock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between text-xs bg-gray-50/50">
              <span style={{ color: "var(--text-muted)" }}>
                Showing <strong>{items.length}</strong> of{" "}
                <strong>{total}</strong> records
              </span>
              <div className="flex gap-2">
                <button
                  className="btn-secondary py-1 px-3"
                  disabled={page <= 1 || loading}
                  onClick={() => fetchSuppressionList(page - 1, search)}
                >
                  Previous
                </button>
                <button
                  className="btn-secondary py-1 px-3"
                  disabled={!hasMore || loading}
                  onClick={() => fetchSuppressionList(page + 1, search)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {/* Add manually modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="glass-card p-6 max-w-md w-full animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="font-bold text-lg mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Suppress Email Manually
            </h3>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="space-y-4 mb-5">
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Email Address
                </label>
                <input
                  className="input"
                  type="email"
                  placeholder="customer@domain.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Type
                </label>
                <Select
                  value={newType}
                  onChange={(value) => setNewType(value)}
                  options={[
                    { label: "Manual (Unsubscribed)", value: "unsubscribe" },
                    { label: "Hard Bounce", value: "bounce" },
                    { label: "Spam Report", value: "spam_report" },
                    { label: "Block", value: "block" },
                    { label: "Invalid Email", value: "invalid" }
                  ]}
                />
              </div>
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Reason / Notes (Optional)
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Requested via support"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className="btn-secondary flex-1"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                onClick={handleAddSuppression}
                disabled={adding || !newEmail.trim()}
              >
                {adding ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : null}
                {adding ? "Adding..." : "Add to List"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
