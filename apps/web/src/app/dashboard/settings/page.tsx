"use client";
import { useState, useEffect } from "react";
import { Settings, Save, Trash2, AlertTriangle, RefreshCw, X, Check, Sparkles, Shield, Unplug } from "lucide-react";
import { LogoLoader } from "@/components/LogoLoader";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                          {app.clientName === "ChatGPT" ? (
                            <span className="text-emerald-600 font-extrabold text-[11px]">GPT</span>
                          ) : app.clientName === "Claude" ? (
                            <span className="text-amber-600 font-extrabold text-[11px]">Claude</span>
                          ) : (
                            <Sparkles size={16} className="text-indigo-600" />
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
                            Connected {new Date(app.createdAt).toLocaleDateString()}
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
