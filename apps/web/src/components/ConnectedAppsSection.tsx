"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  RefreshCw,
  Shield,
  Building2,
  SlidersHorizontal,
  Unplug,
  X,
  Check,
  AlertTriangle,
  PenLine,
  FileText,
  Inbox,
  Trash2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface TeamItem {
  id: string;
  name: string;
}

interface ConnectedApp {
  id: string;
  clientName: string;
  clientId: string;
  teamName: string;
  teamNames?: string[];
  teamId: string;
  teamIds?: string[];
  scope: string;
  createdAt: string;
  expiresAt: string;
}

const AVAILABLE_PERMISSIONS = [
  {
    id: "forms_write",
    scope: "forms:write",
    label: "Create & Edit Forms",
    desc: "Generate new forms with AI and edit questions, fields & styling",
    icon: PenLine,
  },
  {
    id: "forms_read",
    scope: "forms:read",
    label: "Read Forms & Schemas",
    desc: "View form structure, public links, and list existing forms",
    icon: FileText,
  },
  {
    id: "submissions_read",
    scope: "submissions:read",
    label: "View Submissions & Responses",
    desc: "Fetch live respondent answers and submission counts",
    icon: Inbox,
  },
  {
    id: "forms_delete",
    scope: "forms:delete",
    label: "Delete Forms",
    desc: "Permanently delete forms and associated responses",
    icon: Trash2,
    isDanger: true,
  },
];

const SCOPE_META: Record<string, { label: string; isDanger?: boolean }> = {
  "forms:write": { label: "Create & Edit" },
  "forms:read": { label: "Read Forms" },
  "submissions:read": { label: "View Responses" },
  "forms:delete": { label: "Delete Forms", isDanger: true },
};

function OpenAILogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4022-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813v6.7227zm1.1448-1.9213l2.55-1.4716 2.55 1.4716v2.9433l-2.55 1.4716-2.55-1.4716v-2.9433z"/>
    </svg>
  );
}

function ClaudeLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.41 12.79a33.58 33.58 0 0 0 4.79-1.07 1 1 0 0 0 .62-1.25 1 1 0 0 0-.91-.71c-1.83-.09-3.66.19-5.42.84a14.28 14.28 0 0 1 .92-2.31c.88-1.7 1.95-3.3 3.19-4.77a1 1 0 0 0-.15-1.41 1 1 0 0 0-1.41.15c-1.12 1.41-2.09 2.94-2.88 4.56-.47.96-.86 1.96-1.17 2.98-.67-1.42-1.55-2.74-2.61-3.92a1 1 0 0 0-1.46 0 1 1 0 0 0 0 1.46c1.15 1.25 2.08 2.68 2.76 4.23a15.7 15.7 0 0 1-2.45-.63c-1.74-.6-3.4-1.39-4.96-2.35a1 1 0 0 0-1.37.36 1 1 0 0 0 .36 1.37c1.47.91 3.03 1.66 4.67 2.23.8.28 1.62.49 2.45.64a13.9 13.9 0 0 1-1.63 1.83c-1.34 1.25-2.83 2.33-4.44 3.21a1 1 0 0 0-.43 1.35 1 1 0 0 0 1.35.43c1.55-.84 2.98-1.87 4.26-3.07.67-.63 1.29-1.32 1.84-2.05.24 1.54.67 3.04 1.27 4.48a1 1 0 0 0 1.25.56 1 1 0 0 0 .56-1.25c-.64-1.49-1.07-3.06-1.28-4.67a14.4 14.4 0 0 1 2.22 1.2c1.54 1.01 2.94 2.21 4.17 3.56a1 1 0 0 0 1.41.08 1 1 0 0 0 .08-1.41c-1.22-1.33-2.6-2.51-4.11-3.5-.7-.46-1.44-.86-2.2-1.2z" />
    </svg>
  );
}

function GoogleLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function renderAppLogo(nameOrId: string, className = "w-6 h-6") {
  const s = (nameOrId || "").toLowerCase();
  if (s.includes("chatgpt") || s.includes("openai")) return <OpenAILogo className={className} />;
  if (s.includes("claude") || s.includes("anthropic")) return <ClaudeLogo className={className} />;
  if (s.includes("google") || s.includes("gemini")) return <GoogleLogo className={className} />;
  return <Sparkles className={`${className} text-indigo-600`} />;
}

function getAppLogoContainerStyle(nameOrId: string) {
  const s = (nameOrId || "").toLowerCase();
  if (s.includes("chatgpt") || s.includes("openai")) return "bg-emerald-50/70 border-emerald-200/60 text-[#10a37f]";
  if (s.includes("claude") || s.includes("anthropic")) return "bg-amber-50/70 border-amber-200/60 text-[#D97757]";
  if (s.includes("google") || s.includes("gemini")) return "bg-blue-50/70 border-blue-200/60";
  return "bg-indigo-50/70 border-indigo-200/60 text-indigo-600";
}

function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("mf_access_token") ?? "")
    : "";
}

export function ConnectedAppsSection({
  currentTeamId,
  variant = "plain",
}: {
  currentTeamId?: string;
  variant?: "plain" | "card";
}) {
  const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>([]);
  const [availableTeams, setAvailableTeams] = useState<TeamItem[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Edit Modal State
  const [editingApp, setEditingApp] = useState<ConnectedApp | null>(null);
  const [editScopes, setEditScopes] = useState<string[]>([]);
  const [editTeamIds, setEditTeamIds] = useState<string[]>([]);
  const [editPreset, setEditPreset] = useState<"full" | "read_write" | "read_only" | "custom">("custom");
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [editModalError, setEditModalError] = useState("");
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchConnectedApps();
    fetchTeams();
  }, []);

  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  async function fetchTeams() {
    try {
      const res = await fetch(`${API}/v1/teams`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        let list: TeamItem[] = [];
        if (json.data) {
          if (Array.isArray(json.data)) {
            list = json.data;
          } else if (json.data.owned || json.data.member) {
            list = [...(json.data.owned || []), ...(json.data.member || [])];
          }
        } else if (Array.isArray(json.teams)) {
          list = json.teams;
        }
        // Unique teams by ID
        const unique = Array.from(new Map(list.map((item) => [item.id, item])).values());
        setAvailableTeams(unique);
      }
    } catch (err) {
      console.error("Failed to fetch teams", err);
    }
  }

  async function fetchConnectedApps() {
    setLoadingApps(true);
    try {
      const res = await fetch(`${API}/v1/oauth/connected-apps`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.apps)) {
        setConnectedApps(json.apps);
      }
    } catch (err) {
      console.error("Failed to fetch connected apps", err);
    } finally {
      setLoadingApps(false);
    }
  }

  function formatConnectedDate(val: string) {
    if (!val) return "";
    try {
      const raw = String(val).trim();
      const iso = raw.endsWith("Z") || raw.includes("+") ? raw : raw.replace(" ", "T") + "Z";
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return val;
    }
  }

  function getPresetFromScopes(scopes: string[]): "full" | "read_write" | "read_only" | "custom" {
    const s = new Set(scopes);
    const hasWrite = s.has("forms:write");
    const hasRead = s.has("forms:read");
    const hasSubmissions = s.has("submissions:read");
    const hasDelete = s.has("forms:delete");

    if (hasRead && hasWrite && hasSubmissions && hasDelete) return "full";
    if (hasRead && hasWrite && !hasDelete) return "read_write";
    if (hasRead && !hasWrite && !hasDelete) return "read_only";
    return "custom";
  }

  function openEditModal(app: ConnectedApp) {
    const rawScopes = (app.scope || "").split(/\s+/).filter(Boolean);
    const rawTeamIds = app.teamIds && app.teamIds.length > 0
      ? app.teamIds
      : app.teamId ? [app.teamId] : (availableTeams[0]?.id ? [availableTeams[0].id] : []);

    setEditingApp(app);
    setEditScopes(rawScopes);
    setEditTeamIds(rawTeamIds);
    setEditPreset(getPresetFromScopes(rawScopes));
    setEditModalError("");
  }

  function handleEditPresetChange(preset: "full" | "read_write" | "read_only") {
    setEditPreset(preset);
    if (preset === "full") {
      setEditScopes(["forms:read", "forms:write", "submissions:read", "forms:delete"]);
    } else if (preset === "read_write") {
      setEditScopes(["forms:read", "forms:write", "submissions:read"]);
    } else if (preset === "read_only") {
      setEditScopes(["forms:read", "submissions:read"]);
    }
  }

  function toggleEditScope(scope: string) {
    let next: string[];
    if (editScopes.includes(scope)) {
      next = editScopes.filter((s) => s !== scope);
    } else {
      next = [...editScopes, scope];
    }
    setEditScopes(next);
    setEditPreset(getPresetFromScopes(next));
  }

  function toggleProject(teamId: string) {
    if (editTeamIds.includes(teamId)) {
      if (editTeamIds.length === 1) {
        setEditModalError("At least one authorized project is required.");
        return;
      }
      setEditTeamIds(editTeamIds.filter((id) => id !== teamId));
    } else {
      setEditTeamIds([...editTeamIds, teamId]);
    }
    setEditModalError("");
  }

  function handleSelectAllProjects() {
    if (editTeamIds.length === availableTeams.length) {
      // Keep only current or first
      const keep = currentTeamId || availableTeams[0]?.id;
      setEditTeamIds(keep ? [keep] : []);
    } else {
      setEditTeamIds(availableTeams.map((t) => t.id));
    }
    setEditModalError("");
  }

  async function handleRevokeApp(appId: string) {
    if (!confirm("Are you sure you want to disconnect this app? It will no longer be able to access your forms.")) {
      return;
    }
    setRevokingId(appId);
    try {
      const res = await fetch(`${API}/v1/oauth/connected-apps/${encodeURIComponent(appId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setConnectedApps((prev) => prev.filter((a) => a.id !== appId && a.clientId !== appId));
        setToastMsg({ type: "success", text: "Connected application disconnected successfully." });
      } else {
        setToastMsg({ type: "error", text: json.error || "Failed to disconnect application." });
      }
    } catch {
      setToastMsg({ type: "error", text: "Failed to disconnect application." });
    } finally {
      setRevokingId(null);
    }
  }

  async function handleSavePermissions() {
    if (!editingApp) return;
    if (editScopes.length === 0) {
      setEditModalError("Please select at least one permission scope.");
      return;
    }
    if (editTeamIds.length === 0) {
      setEditModalError("Please select at least one project to authorize.");
      return;
    }

    setSavingPermissions(true);
    setEditModalError("");
    try {
      const res = await fetch(`${API}/v1/oauth/connected-apps/${encodeURIComponent(editingApp.id)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope: editScopes.join(" "),
          teamIds: editTeamIds,
          teamId: editTeamIds[0],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setConnectedApps((prev) =>
          prev.map((a) =>
            a.id === editingApp.id
              ? {
                  ...a,
                  scope: json.scope || editScopes.join(" "),
                  teamId: json.teamId || editTeamIds[0],
                  teamIds: json.teamIds || editTeamIds,
                  teamName: json.teamName || a.teamName,
                  teamNames: json.teamNames || a.teamNames,
                }
              : a
          )
        );
        setToastMsg({
          type: "success",
          text: `Permissions updated successfully for ${editingApp.clientName}.`,
        });
        setEditingApp(null);
      } else {
        setEditModalError(json.error || "Failed to update permissions.");
      }
    } catch {
      setEditModalError("Network error while updating permissions.");
    } finally {
      setSavingPermissions(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toast notification */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-all ${
            toastMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-slate-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Connected Apps Container */}
      <div className={variant === "card" ? "glass-card overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs" : "space-y-4"}>
        <div className={variant === "card" ? "p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white" : "pb-4 border-b border-gray-100 flex items-center justify-between"}>
          <div>
            <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 text-slate-900">
              <Sparkles size={18} className="text-indigo-600" /> Connected AI Applications
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage AI assistants (ChatGPT, Claude, Google) and integrations authorized to access your projects.
            </p>
          </div>
          <button
            onClick={fetchConnectedApps}
            disabled={loadingApps}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition active:scale-95 shadow-2xs cursor-pointer"
            title="Refresh connected apps"
          >
            <RefreshCw size={14} className={loadingApps ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>

        <div className={variant === "card" ? "p-5 sm:p-6" : "pt-1"}>
          {loadingApps ? (
            <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin text-indigo-600" />
              Loading connected applications...
            </div>
          ) : connectedApps.length === 0 ? (
            <div className="py-10 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
                <Shield size={20} />
              </div>
              <p className="text-xs font-bold text-slate-800">No AI Connectors Connected</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                When you authorize ChatGPT, Claude, or Google with Qwik Mailer, they will appear here with options to manage permissions across projects or disconnect.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {connectedApps.map((app) => {
                const scopes = (app.scope || "forms:read forms:write").split(/\s+/).filter(Boolean);
                const displayProject = app.teamName || "Project";

                return (
                  <div
                    key={app.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-2xs hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Logo container with brand tint */}
                      <div
                        className={`w-11 h-11 rounded-xl p-2.5 flex items-center justify-center shrink-0 border shadow-2xs ${getAppLogoContainerStyle(
                          app.clientName || app.clientId
                        )}`}
                      >
                        {renderAppLogo(app.clientName || app.clientId, "w-6 h-6")}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* App Name and Status */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-900 tracking-tight">
                            {app.clientName}
                          </h4>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                          <span className="text-slate-300 hidden sm:inline">•</span>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md">
                            <Building2 size={12} className="text-slate-400" />
                            <span>{displayProject}</span>
                          </span>
                        </div>

                        {/* Human-readable permission badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {scopes.map((sc: string) => {
                            const meta = SCOPE_META[sc] || { label: sc };
                            return (
                              <span
                                key={sc}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                                  meta.isDanger
                                    ? "bg-rose-50 text-rose-600 border border-rose-200/60"
                                    : "bg-slate-100/80 text-slate-700 border border-slate-200/70"
                                }`}
                              >
                                <Check
                                  size={11}
                                  className={meta.isDanger ? "text-rose-500" : "text-emerald-600"}
                                  strokeWidth={2.5}
                                />
                                {meta.label}
                              </span>
                            );
                          })}
                        </div>

                        {/* Timestamp */}
                        <p className="text-[11px] text-slate-400 mt-1.5 font-normal">
                          Connected on {formatConnectedDate(app.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => openEditModal(app)}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-95"
                      >
                        <SlidersHorizontal size={13} className="text-slate-500" />
                        Edit Permissions
                      </button>

                      <button
                        onClick={() => handleRevokeApp(app.id)}
                        disabled={revokingId === app.id}
                        className="px-3 py-1.5 rounded-xl border border-transparent hover:border-rose-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50/80 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                        title="Disconnect application"
                      >
                        {revokingId === app.id ? (
                          <>
                            <RefreshCw size={12} className="animate-spin text-rose-500" />
                            <span className="text-rose-600">Disconnecting...</span>
                          </>
                        ) : (
                          <>
                            <Unplug size={13} />
                            Disconnect
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Connected App Permissions Modal */}
      {editingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full flex flex-col max-h-[90vh] shadow-2xl border border-slate-200/90 overflow-hidden animate-fade-up">
            {/* Header (Sticky / Shrink-0) */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl p-2 flex items-center justify-center shrink-0 border shadow-2xs ${getAppLogoContainerStyle(
                    editingApp.clientName || editingApp.clientId
                  )}`}
                >
                  {renderAppLogo(editingApp.clientName || editingApp.clientId, "w-6 h-6")}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">Edit Permissions</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure access permissions for{" "}
                    <span className="font-semibold text-slate-700">{editingApp.clientName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingApp(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body (Scrollable with hidden scrollbar) */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 space-y-4.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {editModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0 text-rose-500" />
                  <span>{editModalError}</span>
                </div>
              )}

              {/* Multiple Authorized Projects Selection */}
              {availableTeams.length > 0 && (
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={13} className="text-indigo-600" />
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Authorized Projects
                      </label>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-700 ml-1">
                        {editTeamIds.length} of {availableTeams.length} Selected
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSelectAllProjects}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      {editTeamIds.length === availableTeams.length ? "Deselect All" : "Select All Projects"}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    The assistant can create, view, and manage forms within any selected project.
                  </p>

                  {/* Multi-project selectable grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {availableTeams.map((team) => {
                      const isSelected = editTeamIds.includes(team.id);
                      return (
                        <div
                          key={team.id}
                          onClick={() => toggleProject(team.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 select-none ${
                            isSelected
                              ? "bg-white border-indigo-400 shadow-2xs"
                              : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-indigo-600 border-indigo-600 text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </div>
                            <span className={`text-xs truncate ${isSelected ? "font-semibold text-slate-900" : "font-medium"}`}>
                              {team.name}
                            </span>
                          </div>
                          {team.id === currentTeamId && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                              Current
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Access Presets (Segmented Pill Tab) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">Access Preset</label>
                  {editPreset === "custom" && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      Custom Scopes
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-100/90 border border-slate-200/60 gap-1">
                  <button
                    type="button"
                    onClick={() => handleEditPresetChange("full")}
                    className={`py-1.5 px-2 rounded-lg text-xs transition-all text-center font-medium ${
                      editPreset === "full"
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Full Control
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditPresetChange("read_write")}
                    className={`py-1.5 px-2 rounded-lg text-xs transition-all text-center font-medium ${
                      editPreset === "read_write"
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Read & Write
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditPresetChange("read_only")}
                    className={`py-1.5 px-2 rounded-lg text-xs transition-all text-center font-medium ${
                      editPreset === "read_only"
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Read Only
                  </button>
                </div>
              </div>

              {/* Granular Permissions Checklist with Toggle Switches */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Granular Permissions
                </label>
                <div className="space-y-2">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const checked = editScopes.includes(perm.scope);
                    const isDelete = Boolean(perm.isDanger);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => toggleEditScope(perm.scope)}
                        className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                          checked
                            ? isDelete
                              ? "bg-rose-50/50 border-rose-200/90 shadow-2xs"
                              : "bg-slate-50/80 border-slate-300/80 shadow-2xs"
                            : "bg-white border-slate-200/70 hover:bg-slate-50/50 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors mt-0.5 ${
                              checked
                                ? isDelete
                                  ? "bg-rose-100 text-rose-600"
                                  : "bg-indigo-50 text-indigo-600"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            <perm.icon size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-semibold text-slate-900">{perm.label}</span>
                              {isDelete && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                  Destructive
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug font-normal">
                              {perm.desc}
                            </p>
                          </div>
                        </div>

                        {/* Modern iOS / Linear Toggle Switch */}
                        <div
                          className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out shrink-0 ${
                            checked
                              ? isDelete
                                ? "bg-rose-600"
                                : "bg-slate-900"
                              : "bg-slate-200"
                          }`}
                        >
                          <div
                            className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform duration-200 ease-in-out ${
                              checked ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notice Banner */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500 leading-snug flex items-center gap-2">
                <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
                <span>Permission and project updates apply immediately across all active AI conversations.</span>
              </div>
            </div>

            {/* Footer (Sticky / Shrink-0) */}
            <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setEditingApp(null)}
                disabled={savingPermissions}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-slate-200/60 bg-white transition-all shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={savingPermissions || editScopes.length === 0 || editTeamIds.length === 0}
                className="btn-primary px-4.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-95 disabled:opacity-50"
              >
                {savingPermissions ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    Save Permissions
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
