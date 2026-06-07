"use client";
import { useState, useEffect } from "react";
import {
  Users,
  Mail,
  Crown,
  Shield,
  Eye,
  Copy,
  Check,
  X,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Select } from "@/components/Select";
import { LogoLoader } from "@/components/LogoLoader";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("mf_access_token") ?? "")
    : "";
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown size={12} />,
  admin: <Shield size={12} />,
  member: <Users size={12} />,
  viewer: <Eye size={12} />,
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

interface Team {
  id: string;
  name: string;
  slug: string;
  role: string;
  member_count: number;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  joined_at: string;
}

export default function TeamPage() {
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState("");

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

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
          await fetchMembers(current.id);
        }
      }
    } catch {
      setError("Failed to load project details.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMembers(teamId: string) {
    setMembersLoading(true);
    try {
      const res = await fetch(`${API}/v1/teams/${teamId}/members`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setMembers(json.data);
    } catch {
    } finally {
      setMembersLoading(false);
    }
  }

  async function inviteMember() {
    if (!inviteEmail.trim() || !activeTeam) return;
    setInviting(true);
    try {
      const res = await fetch(`${API}/v1/teams/${activeTeam.id}/invite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const json = await res.json();
      if (json.success) {
        setInviteLink(json.data.inviteLink);
        setInviteEmail("");
      } else {
        setError(json.error ?? "Failed to send invite.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!activeTeam || !confirm("Remove this member?")) return;
    try {
      await fetch(`${API}/v1/teams/${activeTeam.id}/members/${memberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch {}
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-5 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Project Members
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Invite teammates and manage roles for this project.
          </p>
        </div>
        {(activeTeam?.role === "owner" || activeTeam?.role === "admin") && (
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setShowInvite(!showInvite)}
          >
            <Mail size={14} /> Invite Member
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="glass-card overflow-hidden min-h-[300px]">
          <LogoLoader fullPage text="Loading project details..." />
        </div>
      ) : activeTeam ? (
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <div>
              <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                {activeTeam.name}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">/{activeTeam.slug}</p>
            </div>
          </div>

          {showInvite && (
            <div className="p-5 bg-gray-50/50 border-b space-y-4" style={{ borderColor: "var(--border)" }}>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  className="input flex-1"
                  type="email"
                  placeholder="teammate@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <Select
                  className="w-full sm:w-36"
                  value={inviteRole}
                  onChange={(value) => setInviteRole(value as any)}
                  options={[
                    { label: "Admin", value: "admin" },
                    { label: "Member", value: "member" },
                    { label: "Viewer", value: "viewer" }
                  ]}
                />
                <button
                  className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
                  onClick={inviteMember}
                  disabled={inviting || !inviteEmail}
                >
                  {inviting ? <RefreshCw size={14} className="animate-spin" /> : <Mail size={14} />}
                  Send Invite
                </button>
              </div>

              {inviteLink && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 mb-0.5">Invite Link Generated</p>
                    <p className="text-xs font-mono truncate text-gray-500">{inviteLink}</p>
                  </div>
                  <button
                    onClick={copyInviteLink}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-600 transition-colors"
                  >
                    {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-white border border-gray-100">
                  <p className="text-xs font-bold text-gray-900 mb-1">Admin</p>
                  <p className="text-[11px] text-gray-500">Can invite members, view and manage all campaigns and settings.</p>
                </div>
                <div className="p-3 rounded-lg bg-white border border-gray-100">
                  <p className="text-xs font-bold text-gray-900 mb-1">Member</p>
                  <p className="text-[11px] text-gray-500">Can send emails, manage templates and view logs.</p>
                </div>
                <div className="p-3 rounded-lg bg-white border border-gray-100">
                  <p className="text-xs font-bold text-gray-900 mb-1">Viewer</p>
                  <p className="text-[11px] text-gray-500">Read-only access to analytics and logs.</p>
                </div>
              </div>
            </div>
          )}

          {membersLoading ? (
            <div className="p-12 text-center text-sm text-gray-400">
              <RefreshCw size={20} className="animate-spin mx-auto mb-3" />
              Loading members...
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {members.map((member) => (
                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-800 to-gray-900 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm border border-gray-900">
                      {member.name?.[0]?.toUpperCase() ?? member.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                        {member.name || member.email}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-13 sm:pl-0">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${member.role === "owner" ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-gray-50 text-gray-700 border-gray-200"}`}>
                      {ROLE_ICONS[member.role]} {ROLE_LABELS[member.role]}
                    </div>
                    {activeTeam.role === "owner" && member.role !== "owner" && (
                      <button
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors shrink-0"
                        onClick={() => removeMember(member.id)}
                        title="Remove member"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card p-12 text-center h-full flex flex-col items-center justify-center min-h-[300px]">
          <Users size={32} className="text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">No Project Selected</p>
          <p className="text-xs text-gray-500">
            Please select a project from the sidebar to view and manage its members.
          </p>
        </div>
      )}
    </div>
  );
}
