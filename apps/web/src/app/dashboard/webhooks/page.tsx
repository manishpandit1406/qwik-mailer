"use client";
import { formatIST } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import {
  Plus,
  Webhook,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Activity,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { LogoLoader } from "@/components/LogoLoader";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  failureCount: number;
  lastFiredAt?: string;
  createdAt: string;
}
const ENGAGEMENT_EVENTS = [
  { id: "opened", label: "Opened" },
  { id: "clicked", label: "Clicked" },
  { id: "unsubscribed", label: "Unsubscribed" },
  { id: "complained", label: "Spam Reports" },
];

const DELIVERABILITY_EVENTS = [
  { id: "queued", label: "Processed" },
  { id: "delivered", label: "Delivered" },
  { id: "bounced", label: "Bounced" },
  { id: "failed", label: "Dropped/Failed" },
];

const ALL_EVENTS = [...ENGAGEMENT_EVENTS, ...DELIVERABILITY_EVENTS].map(e => e.id);
function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("mf_access_token") ?? "")
    : "";
}
export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedWebhookLogs, setSelectedWebhookLogs] = useState<string | null>(
    null,
  );
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");
  
  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }
  async function fetchWebhooks() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/webhooks`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json();
      if (json.success) setWebhooks(json.data);
    } catch {
      setError("Failed to load webhooks.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const userStr = localStorage.getItem("mf_user");
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        if (parsed.plan) setUserPlan(parsed.plan);
      } catch (e) {}
    }
    const fetchPlanAndWebhooks = async () => {
      try {
        const res = await fetch(`${API}/v1/auth/me`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const json = await res.json();
        if (json.success && json.data.plan) {
          setUserPlan(json.data.plan);
          if (userStr) {
            try {
              const parsed = JSON.parse(userStr);
              parsed.plan = json.data.plan;
              localStorage.setItem("mf_user", JSON.stringify(parsed));
            } catch (e) {}
          }
        }
      } catch (e) {}
      fetchWebhooks();
    };
    fetchPlanAndWebhooks();
  }, []);
  async function createWebhook() {
    if (!newUrl || selectedEvents.length === 0) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${API}/v1/webhooks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: newUrl, events: selectedEvents }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Failed to create webhook.");
        return;
      }
      setNewSecret(json.data.secret);
      await fetchWebhooks();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }
  async function deleteWebhook(id: string) {
    if (!confirm("Delete this webhook? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API}/v1/webhooks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setWebhooks(webhooks.filter((w) => w.id !== id));
      else setError(json.error ?? "Failed to delete webhook.");
    } catch {
      setError("Network error.");
    }
  }
  function closeCreate() {
    setShowCreate(false);
    setNewSecret(null);
    setNewUrl("");
    setSelectedEvents([]);
    setError("");
  }
  async function fetchWebhookLogs(id: string) {
    setSelectedWebhookLogs(id);
    setLoadingLogs(true);
    setWebhookLogs([]);
    try {
      const res = await fetch(`${API}/v1/webhooks/${id}/logs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setWebhookLogs(json.data);
    } catch {
    } finally {
      setLoadingLogs(false);
    }
  }
  function copySecret(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (userPlan === "free") {
    return (
      <div className="max-w-3xl mx-auto w-full py-16 text-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Webhook size={32} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Webhooks</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Receive real-time HTTP events when emails are delivered, opened, clicked, or bounced. This feature is not available on your current plan.
          </p>
          <a href="/projects/billing" className="btn-primary inline-flex">
            Upgrade to Starter or Pro
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full space-y-5 pb-10">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2
            className="text-xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Webhooks
          </h2>{" "}
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Receive real-time events when emails are delivered, opened, or
            bounced.
          </p>{" "}
        </div>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <button
            className="btn-ghost p-2"
            title="Refresh"
            onClick={fetchWebhooks}
          >
            {" "}
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />{" "}
          </button>{" "}
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setShowCreate(true)}
          >
            {" "}
            <Plus size={14} /> Add Webhook{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          {" "}
          {error}{" "}
          <button
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-600 ml-2"
          >
            ✕
          </button>{" "}
        </div>
      )}{" "}
      <div className="glass-card p-5">
        {" "}
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          Example Payload
        </p>{" "}
        <pre className="code-block text-xs overflow-x-auto">
          {`{
  "event": "delivered",
  "emailId": "em_01jxxxxxxxx",
  "to": "user@example.com",
  "subject": "Welcome!",
  "occurredAt": "2025-05-27T14:28:00.000Z"
}`}
        </pre>{" "}
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          {" "}
          Requests include{" "}
          <code className="code-block py-0.5 px-1 text-xs">
            X-Qwik-Mailer-Signature
          </code>{" "}
          header for HMAC-SHA256 verification.{" "}
        </p>{" "}
      </div>{" "}
      {/* Webhooks list */}{" "}
      {loading ? (
        <div className="glass-card overflow-hidden">
          <LogoLoader fullPage text="Loading webhooks..." />
        </div>
      ) : webhooks.length === 0 ? (
        <div className="glass-card p-12 text-center">
          {" "}
          <Webhook size={32} className="mx-auto mb-3 text-gray-300" />{" "}
          <p
            className="font-medium mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            No webhooks yet
          </p>{" "}
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Add an endpoint to receive real-time email events.
          </p>{" "}
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            Add Your First Webhook
          </button>{" "}
        </div>
      ) : (
        <div className="space-y-3">
          {" "}
          {webhooks.map((wh) => (
            <div key={wh.id} className="glass-card p-5">
              {" "}
              <div className="flex items-start justify-between gap-4">
                {" "}
                <div className="flex-1 min-w-0">
                  {" "}
                  <div className="flex items-center gap-2 mb-2">
                    {" "}
                    {wh.isActive && wh.failureCount === 0 ? (
                      <CheckCircle2
                        size={14}
                        className="text-emerald-500 shrink-0"
                      />
                    ) : (
                      <AlertCircle
                        size={14}
                        className={
                          wh.failureCount > 0
                            ? "text-amber-500 shrink-0"
                            : "text-red-500 shrink-0"
                        }
                      />
                    )}{" "}
                    <span
                      className="font-mono text-sm truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {wh.url}
                    </span>{" "}
                  </div>{" "}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {" "}
                    {wh.events.map((e) => (
                      <span key={e} className="badge-info text-xs">
                        {e}
                      </span>
                    ))}{" "}
                  </div>{" "}
                  <div
                    className="flex gap-4 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {" "}
                    <span>
                      Created {formatIST(wh.createdAt, false)}
                    </span>{" "}
                    {wh.lastFiredAt && (
                      <span>Last fired: {wh.lastFiredAt}</span>
                    )}{" "}
                    {wh.failureCount > 0 && (
                      <span className="text-amber-600">
                        ⚠ {wh.failureCount} failures
                      </span>
                    )}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="flex gap-1 shrink-0">
                  {" "}
                  <button
                    className="btn-ghost p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                    onClick={() => fetchWebhookLogs(wh.id)}
                    title="View Logs"
                  >
                    {" "}
                    <Activity size={13} />{" "}
                  </button>{" "}
                  <button
                    className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => deleteWebhook(wh.id)}
                    title="Delete"
                  >
                    {" "}
                    <Trash2 size={13} />{" "}
                  </button>{" "}
                </div>{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>
      )}{" "}
      {/* Create modal */}{" "}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
          onClick={closeCreate}
        >
          {" "}
          <div
            className="glass-card p-6 max-w-md w-full animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            {" "}
            {!newSecret ? (
              <>
                {" "}
                <h3
                  className="font-bold text-lg mb-4"
                  style={{ color: "var(--text-primary)" }}
                >
                  Add Webhook
                </h3>{" "}
                {error && <p className="text-sm text-red-600 mb-3">{error}</p>}{" "}
                <div className="space-y-4">
                  {" "}
                  <div>
                    {" "}
                    <label
                      className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Endpoint URL
                    </label>{" "}
                    <input
                      className="input"
                      placeholder="https://yourapp.com/webhooks/email"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                    />{" "}
                  </div>{" "}
                  <div>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Engagement Data */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-3 text-indigo-600">
                          Engagement Data
                        </p>
                        <div className="space-y-2">
                          {ENGAGEMENT_EVENTS.map((event) => (
                            <label
                              key={event.id}
                              className="flex items-center gap-3 cursor-pointer group"
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedEvents.includes(event.id) ? "bg-indigo-600 border-indigo-600" : "border-gray-300 bg-white group-hover:border-indigo-400"}`}>
                                {selectedEvents.includes(event.id) && <CheckCircle2 size={12} className="text-white" />}
                              </div>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={selectedEvents.includes(event.id)}
                                onChange={() => toggleEvent(event.id)}
                              />
                              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                                {event.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Deliverability Data */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-3 text-indigo-600">
                          Deliverability Data
                        </p>
                        <div className="space-y-2">
                          {DELIVERABILITY_EVENTS.map((event) => (
                            <label
                              key={event.id}
                              className="flex items-center gap-3 cursor-pointer group"
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedEvents.includes(event.id) ? "bg-indigo-600 border-indigo-600" : "border-gray-300 bg-white group-hover:border-indigo-400"}`}>
                                {selectedEvents.includes(event.id) && <CheckCircle2 size={12} className="text-white" />}
                              </div>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={selectedEvents.includes(event.id)}
                                onChange={() => toggleEvent(event.id)}
                              />
                              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                                {event.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>{" "}
                <div className="flex gap-3 mt-5">
                  {" "}
                  <button
                    className="btn-secondary flex-1"
                    onClick={closeCreate}
                  >
                    Cancel
                  </button>{" "}
                  <button
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    disabled={
                      !newUrl || selectedEvents.length === 0 || creating
                    }
                    onClick={createWebhook}
                  >
                    {" "}
                    {creating ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : null}{" "}
                    {creating ? "Adding..." : "Add Webhook"}{" "}
                  </button>{" "}
                </div>{" "}
              </>
            ) : (
              <>
                {" "}
                <div className="flex items-center gap-2 mb-4">
                  {" "}
                  <CheckCircle2 size={20} className="text-emerald-500" />{" "}
                  <h3
                    className="font-bold text-lg"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Webhook Created!
                  </h3>{" "}
                </div>{" "}
                <div className="p-3 rounded-xl mb-4 bg-emerald-50 border border-emerald-100">
                  {" "}
                  <p className="text-xs mb-2 text-emerald-700">
                    ⚠️ Save this signing secret — it will not be shown again.
                  </p>{" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    <code className="flex-1 text-xs font-mono break-all text-indigo-700">
                      {newSecret}
                    </code>{" "}
                    <button
                      className="btn-secondary p-2 shrink-0"
                      onClick={() => copySecret(newSecret)}
                    >
                      {" "}
                      {copied ? (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      ) : (
                        <Copy size={14} />
                      )}{" "}
                    </button>{" "}
                  </div>{" "}
                </div>{" "}
                <button className="btn-primary w-full" onClick={closeCreate}>
                  Done
                </button>{" "}
              </>
            )}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Logs Modal */}{" "}
      {selectedWebhookLogs && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedWebhookLogs(null)}
        >
          {" "}
          <div
            className="glass-card p-0 max-w-3xl w-full animate-fade-up overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {" "}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              {" "}
              <h3
                className="font-bold text-lg"
                style={{ color: "var(--text-primary)" }}
              >
                Delivery Logs
              </h3>{" "}
              <button
                className="btn-ghost p-1"
                onClick={() => setSelectedWebhookLogs(null)}
              >
                ✕
              </button>{" "}
            </div>{" "}
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
              {" "}
              {loadingLogs ? (
                <div
                  className="p-8 text-center"
                  style={{ color: "var(--text-muted)" }}
                >
                  {" "}
                  <RefreshCw
                    size={20}
                    className="animate-spin mx-auto mb-3"
                  />{" "}
                  Loading logs...{" "}
                </div>
              ) : webhookLogs.length === 0 ? (
                <div
                  className="p-8 text-center"
                  style={{ color: "var(--text-muted)" }}
                >
                  {" "}
                  No logs available for this webhook yet.{" "}
                </div>
              ) : (
                <div className="space-y-4">
                  {" "}
                  {webhookLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                    >
                      {" "}
                      <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        {" "}
                        <div className="flex items-center gap-3">
                          {" "}
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${!log.responseStatus ? "bg-red-100 text-red-700" : log.responseStatus >= 200 && log.responseStatus < 300 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                          >
                            {" "}
                            {log.responseStatus || "Error"}{" "}
                          </span>{" "}
                          <span className="text-xs font-medium text-gray-600">
                            {formatIST(log.createdAt, false)}
                          </span>{" "}
                        </div>{" "}
                        <span className="badge-info text-[10px]">
                          {log.payload?.event}
                        </span>{" "}
                      </div>{" "}
                      <div className="p-4 space-y-4">
                        {" "}
                        <div>
                          {" "}
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Request Payload
                          </p>{" "}
                          <pre className="code-block text-[11px] overflow-x-auto p-2 bg-slate-900 text-slate-300 rounded-lg">
                            {" "}
                            {JSON.stringify(log.payload, null, 2)}{" "}
                          </pre>{" "}
                        </div>{" "}
                        {log.responseBody && (
                          <div>
                            {" "}
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                              Response
                            </p>{" "}
                            <pre className="code-block text-[11px] overflow-x-auto p-2 bg-gray-100 text-gray-800 rounded-lg border border-gray-200">
                              {" "}
                              {log.responseBody}{" "}
                            </pre>{" "}
                          </div>
                        )}{" "}
                      </div>{" "}
                    </div>
                  ))}{" "}
                </div>
              )}{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
