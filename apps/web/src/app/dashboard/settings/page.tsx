"use client";
import { useState, useEffect } from "react";
import { Settings, Save, Trash2, AlertTriangle, RefreshCw, X, Check } from "lucide-react";
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

  useEffect(() => {
    fetchActiveTeam();
  }, []);

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
