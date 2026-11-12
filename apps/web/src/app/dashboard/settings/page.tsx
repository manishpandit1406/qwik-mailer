"use client";
import { useState, useEffect } from "react";
import { Settings, Save, Trash2, AlertTriangle, RefreshCw, X, Check, Sparkles, Shield, Unplug } from "lucide-react";
import { LogoLoader } from "@/components/LogoLoader";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("mf_access_token") ?? "")
    : "";
}

interface Team {
  id: string;
  name: string;
  slug: string;
  role: string;
  created_at: string;
}

export default function ProjectSettingsPage() {
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Connected Apps State
  const [connectedApps, setConnectedApps] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveTeam();
    fetchConnectedApps();
  }, []);

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
        setSuccess("Connected application disconnected successfully.");
      } else {
        setError(json.error || "Failed to disconnect application.");
      }
    } catch {
      setError("Failed to disconnect application.");
    } finally {
      setRevokingId(null);
    }
  }

  async function fetchActiveTeam() {
    setLoading(true);
    try {
      const activeTeamId = localStorage.getItem("mf_active_team");
      if (!activeTeamId) {
        setLoading(false);
        return;
      }
      
      const res = await fetch(`${API}/v1/teams`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        const allTeams = [
          ...(json.data.owned || []).map((t: any) => ({ ...t, role: "owner" })),
          ...(json.data.member || []).filter(
            (m: any) => !(json.data.owned || []).some((o: any) => o.id === m.id)
          ),
        ];
        const current = allTeams.find((t: any) => t.id === activeTeamId);
        if (current) {
          setActiveTeam(current);
          setNewName(current.name);
        }
      }
    } catch {
      setError("Failed to load project details.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!newName.trim() || !activeTeam || newName === activeTeam.name) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API}/v1/teams/${activeTeam.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess("Project updated successfully!");
        setActiveTeam({ ...activeTeam, name: newName.trim() });
        // Optionally update the active team locally
        setTimeout(() => {
          window.location.reload(); // Reload to refresh sidebar team switcher
        }, 1000);
      } else {
        setError(json.error ?? "Failed to update project.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!activeTeam) return;
    if (deleteConfirmText !== activeTeam.name) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`${API}/v1/teams/${activeTeam.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        localStorage.removeItem("mf_active_team");
        window.location.href = "/projects";
      } else {
        setError(json.error ?? "Failed to delete project.");
        setDeleting(false);
        setShowDeleteModal(false);
      }
    } catch {
      setError("Network error.");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-5 pb-10">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Project Settings
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Manage your project name, properties, and danger zone actions.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
          <Check size={16} />
          {success}
          <button onClick={() => setSuccess("")} className="ml-auto text-emerald-500 hover:text-emerald-700">
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="glass-card overflow-hidden min-h-[300px]">
          <LogoLoader fullPage text="Loading project settings..." />
        </div>
      ) : activeTeam ? (
        <div className="space-y-6">
          {/* General Settings */}
          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="font-bold text-lg flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Settings size={18} className="text-indigo-500" /> General Settings
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  Project Name
                </label>
                <div className="flex gap-3 max-w-md">
                  <input
                    type="text"
                    className="input flex-1"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    disabled={activeTeam.role !== "owner"}
                  />
                  {activeTeam.role === "owner" && (
                    <button
                      className="btn-primary flex items-center gap-2 px-4"
                      onClick={handleSave}
                      disabled={saving || newName.trim() === "" || newName === activeTeam.name}
                    >
                      {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      Save
                    </button>
                  )}
                </div>
                {activeTeam.role !== "owner" && (
                  <p className="text-xs text-gray-500 mt-2">Only the project owner can change the project name.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  Project ID / Slug
                </label>
                <input
                  type="text"
                  className="input max-w-md bg-gray-50 text-gray-500"
                  value={activeTeam.slug}
                  disabled
                />
                <p className="text-xs text-gray-500 mt-2">The unique identifier for this project. Cannot be changed.</p>
              </div>
            </div>
          </div>

          {/* Connected AI & OAuth Applications */}
          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <Sparkles size={18} className="text-indigo-600" /> Connected AI Applications
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage AI assistants (ChatGPT, Claude) and integrations authorized to access your account.
                </p>
              </div>
              <button
                onClick={fetchConnectedApps}
                disabled={loadingApps}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition"
                title="Refresh connected apps"
              >
                <RefreshCw size={14} className={loadingApps ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="p-6">
              {loadingApps ? (
                <div className="py-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-indigo-600" />
                  Loading connected applications...
                </div>
              ) : connectedApps.length === 0 ? (
                <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                    <Shield size={18} />
                  </div>
                  <p className="text-xs font-semibold text-gray-800">No AI Connectors Connected</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-0.5">
                    When you authorize ChatGPT or Claude with Qwik Mailer, they will appear here with options to manage or disconnect.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {connectedApps.map((app) => (
                    <div key={app.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-2 flex items-center justify-center shadow-xs shrink-0">
                          {app.clientName?.toLowerCase().includes("chatgpt") || app.clientId?.toLowerCase().includes("chatgpt") ? (
                            <OpenAILogo className="w-6 h-6 text-[#10a37f]" />
                          ) : app.clientName?.toLowerCase().includes("claude") || app.clientId?.toLowerCase().includes("claude") ? (
                            <ClaudeLogo className="w-6 h-6 text-[#D97757]" />
                          ) : (
                            <Sparkles size={18} className="text-indigo-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-gray-900 truncate">{app.clientName}</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            Project: <span className="font-medium text-gray-700">{app.teamName}</span> • Permissions:{" "}
                            <span className="text-gray-600">{app.scope || "forms:read forms:write"}</span>
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Connected {formatConnectedDate(app.createdAt)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRevokeApp(app.id)}
                        disabled={revokingId === app.id}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {revokingId === app.id ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            Revoking...
                          </>
                        ) : (
                          <>
                            <Unplug size={12} />
                            Disconnect
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          {activeTeam.role === "owner" && (
            <div className="glass-card overflow-hidden border-red-200">
              <div className="p-5 border-b border-red-100 bg-red-50/30">
                <h3 className="font-bold text-lg flex items-center gap-2 text-red-600">
                  <AlertTriangle size={18} /> Danger Zone
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Delete Project</h4>
                  <p className="text-sm text-gray-500">
                    Once you delete a project, there is no going back. This will permanently delete all domains, webhooks, templates, and logs associated with this project.
                  </p>
                </div>
                <button
                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-semibold text-sm hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2"
                  onClick={() => {
                    setDeleteConfirmText("");
                    setShowDeleteModal(true);
                  }}
                  disabled={deleting}
                >
                  <Trash2 size={14} />
                  Delete Project
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card p-12 text-center h-full flex flex-col items-center justify-center min-h-[300px]">
          <Settings size={32} className="text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">No Project Selected</p>
          <p className="text-xs text-gray-500">
            Please select a project from the sidebar to view its settings.
          </p>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-fade-up border border-gray-100 m-4">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Project</h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                Are you sure you want to delete this project? This action cannot be undone and will permanently delete all associated data.
              </p>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Please type <span className="font-bold text-black select-all">{activeTeam?.name}</span> to confirm.
                </label>
                <input
                  type="text"
                  className="input w-full"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={activeTeam?.name}
                />
              </div>
              <div className="flex gap-3">
                <button
                  className="btn-secondary flex-1"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText("");
                  }}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-xl flex-1 flex justify-center items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={confirmDelete}
                  disabled={deleting || deleteConfirmText !== activeTeam?.name}
                >
                  {deleting ? <RefreshCw size={18} className="animate-spin" /> : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
