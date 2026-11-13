"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Radio,
  Plus,
  Search,
  RefreshCw,
  Users,
  Eye,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  X,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Calendar,
  XCircle,
} from "lucide-react";
import { LogoLoader } from "@/components/LogoLoader";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem("mf_access_token") ?? ""
    : "";
}

function getTeamId() {
  return typeof window !== "undefined"
    ? localStorage.getItem("mf_active_team") ?? ""
    : "";
}

interface Broadcast {
  id: string;
  name: string;
  subject: string;
  fromEmail: string;
  fromName?: string;
  status: "sent" | "scheduled" | "sending" | "draft" | "cancelled";
  totalRecipients: number;
  deliveredCount: number;
  pendingCount: number;
  failedCount: number;
  openCount: number;
  clickCount: number;
  openRate: number;
  clickRate: number;
  createdAt: string;
  scheduledAt?: string;
}

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBroadcast, setSelectedBroadcast] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  async function fetchBroadcasts() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/broadcasts`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "x-team-id": getTeamId(),
        },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBroadcasts(json.data);
      }
    } catch (e) {
      console.error("Failed to load broadcasts:", e);
    } finally {
      setLoading(false);
    }
  }

  async function viewBroadcastDetail(batchId: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API}/v1/broadcasts/${batchId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "x-team-id": getTeamId(),
        },
      });
      const json = await res.json();
      if (json.success) {
        setSelectedBroadcast(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  }

  async function cancelBroadcast(batchId: string) {
    if (!confirm("Are you sure you want to cancel remaining queued emails in this broadcast?")) return;
    setCancellingId(batchId);
    try {
      const res = await fetch(`${API}/v1/broadcasts/${batchId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "x-team-id": getTeamId(),
        },
      });
      const json = await res.json();
      if (json.success) {
        fetchBroadcasts();
        if (selectedBroadcast?.id === batchId) {
          setSelectedBroadcast(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCancellingId(null);
    }
  }

  const filtered = broadcasts.filter((b) => {
    const matchesSearch =
      b.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.fromEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRecipientsAll = broadcasts.reduce((sum, b) => sum + b.totalRecipients, 0);
  const totalDeliveredAll = broadcasts.reduce((sum, b) => sum + b.deliveredCount, 0);
  const avgOpenRate =
    broadcasts.length > 0
      ? Math.round(
          broadcasts.reduce((sum, b) => sum + b.openRate, 0) / broadcasts.length
        )
      : 0;
  const avgClickRate =
    broadcasts.length > 0
      ? Math.round(
          broadcasts.reduce((sum, b) => sum + b.clickRate, 0) / broadcasts.length
        )
      : 0;

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Broadcasts
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Resend Campaigns
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Send one-off marketing campaigns, newsletters, and announcements to your audience.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBroadcasts}
            className="btn-secondary p-2.5 flex items-center justify-center rounded-xl"
            title="Refresh broadcasts"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <Link
            href="/dashboard/broadcasts/new"
            className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all"
          >
            <Plus size={16} /> New Broadcast
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-2">
            <span>Total Broadcasts</span>
            <Radio size={15} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{broadcasts.length}</div>
          <div className="text-xs text-gray-400 mt-1">Campaigns executed</div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-2">
            <span>Audience Reached</span>
            <Users size={15} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{totalRecipientsAll.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">{totalDeliveredAll.toLocaleString()} delivered</div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-2">
            <span>Avg. Open Rate</span>
            <BarChart3 size={15} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{avgOpenRate}%</div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${avgOpenRate}%` }} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-2">
            <span>Avg. Click Rate</span>
            <Sparkles size={15} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{avgClickRate}%</div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${avgClickRate}%` }} />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search broadcasts by subject or sender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10"
          />
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
          {(["all", "sent", "sending", "scheduled"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                statusFilter === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Broadcasts List */}
      {loading ? (
        <div className="glass-card min-h-[350px] flex items-center justify-center rounded-2xl">
          <LogoLoader fullPage text="Loading broadcasts..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl min-h-[350px] flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
            <Radio size={28} />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">No Broadcasts Found</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Broadcasts allow you to design newsletters and mass emails to your contacts with analytics tracking and audience targeting.
          </p>
          <Link
            href="/dashboard/broadcasts/new"
            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium"
          >
            <Plus size={16} /> Create Your First Broadcast
          </Link>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden divide-y" style={{ borderColor: "var(--border)" }}>
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-gray-50/70 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-5">Broadcast</div>
            <div className="col-span-2">Audience</div>
            <div className="col-span-2">Engagement</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {filtered.map((broadcast) => (
            <div
              key={broadcast.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 p-5 md:px-6 md:py-4 items-center hover:bg-gray-50/50 transition-colors"
            >
              {/* Name & Subject */}
              <div className="md:col-span-5 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate mb-0.5">
                  {broadcast.subject}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
                  <span>From: {broadcast.fromName ? `${broadcast.fromName} (${broadcast.fromEmail})` : broadcast.fromEmail}</span>
                  <span>&bull;</span>
                  <span>{new Date(broadcast.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>

              {/* Audience */}
              <div className="md:col-span-2 flex items-center gap-2 text-xs text-gray-600">
                <Users size={14} className="text-gray-400 shrink-0" />
                <span>
                  <strong className="text-gray-900 font-semibold">{broadcast.totalRecipients.toLocaleString()}</strong> recipients
                </span>
              </div>

              {/* Engagement */}
              <div className="md:col-span-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Opens</span>
                  <span className="font-medium text-gray-900">{broadcast.openRate}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                  <div className="bg-indigo-500 h-1 rounded-full" style={{ width: `${broadcast.openRate}%` }} />
                </div>
              </div>

              {/* Status */}
              <div className="md:col-span-2 flex items-center gap-2">
                {broadcast.status === "sent" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={12} /> Sent
                  </span>
                )}
                {broadcast.status === "sending" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <RefreshCw size={12} className="animate-spin" /> Sending ({broadcast.pendingCount} left)
                  </span>
                )}
                {broadcast.status === "scheduled" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock size={12} /> Scheduled
                  </span>
                )}
                {broadcast.status === "cancelled" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    <XCircle size={12} /> Cancelled
                  </span>
                )}
              </div>

              {/* Action */}
              <div className="md:col-span-1 flex items-center justify-end gap-1">
                <button
                  onClick={() => viewBroadcastDetail(broadcast.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="View report"
                >
                  <Eye size={16} />
                </button>
                {broadcast.status === "sending" && (
                  <button
                    onClick={() => cancelBroadcast(broadcast.id)}
                    disabled={cancellingId === broadcast.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Cancel broadcast"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Broadcast Detail Report Modal */}
      {selectedBroadcast && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Broadcast Report</span>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">{selectedBroadcast.subject}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  From: {selectedBroadcast.fromName ? `${selectedBroadcast.fromName} <${selectedBroadcast.fromEmail}>` : selectedBroadcast.fromEmail}
                </p>
              </div>
              <button
                onClick={() => setSelectedBroadcast(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Metrics */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-xs text-gray-500">Recipients</div>
                  <div className="text-xl font-bold text-gray-900 mt-0.5">{selectedBroadcast.totalRecipients}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-xs text-emerald-700">Delivered</div>
                  <div className="text-xl font-bold text-emerald-800 mt-0.5">{selectedBroadcast.deliveredCount}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="text-xs text-blue-700">Open Rate</div>
                  <div className="text-xl font-bold text-blue-800 mt-0.5">{selectedBroadcast.openRate}%</div>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100">
                  <div className="text-xs text-purple-700">Click Rate</div>
                  <div className="text-xl font-bold text-purple-800 mt-0.5">{selectedBroadcast.clickRate}%</div>
                </div>
              </div>

              {/* Recipient Deliveries Table */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Recipients Breakdown</h4>
                <div className="border border-gray-100 rounded-xl overflow-hidden divide-y max-h-60 overflow-y-auto">
                  {selectedBroadcast.recipients?.length > 0 ? (
                    selectedBroadcast.recipients.map((r: any) => (
                      <div key={r.id} className="p-3 flex items-center justify-between text-xs hover:bg-gray-50">
                        <div>
                          <p className="font-semibold text-gray-900">{r.toEmail}</p>
                          {r.toName && <p className="text-[11px] text-gray-400">{r.toName}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          {r.openCount > 0 && (
                            <span className="text-blue-600 font-medium">Opened ({r.openCount})</span>
                          )}
                          {r.clickCount > 0 && (
                            <span className="text-purple-600 font-medium">Clicked ({r.clickCount})</span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                            r.status === "delivered" ? "bg-emerald-50 text-emerald-700" :
                            r.status === "queued" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-gray-400">No recipient details found.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setSelectedBroadcast(null)}
                className="btn-secondary px-4 py-2 text-sm"
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

