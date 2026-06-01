"use client";
import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Trash2,
  RefreshCw,
  Mail,
  Crown,
  Shield,
  Eye,
  Copy,
  Check,
  X,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
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
  const [teams, setTeams] = useState<{ owned: Team[]; member: Team[] }>({
    owned: [],
    member: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">(
    "member",
  );
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    fetchTeams();
  }, []);
  async function fetchTeams() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/teams`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setTeams(json.data);
        if (json.data.owned?.length > 0 && !activeTeam) {
          selectTeam({ ...json.data.owned[0], role: "owner" });
        }
      }
    } catch {
      setError("Failed to load teams.");
    } finally {
      setLoading(false);
    }
  }
  async function selectTeam(team: Team) {
    setActiveTeam(team);
    setMembersLoading(true);
    try {
      const res = await fetch(`${API}/v1/teams/${team.id}/members`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setMembers(json.data);
    } catch {
    } finally {
      setMembersLoading(false);
    }
  }
  async function createTeam() {
    if (!newTeamName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/v1/teams`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newTeamName }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreate(false);
        setNewTeamName("");
        await fetchTeams();
      } else {
        setError(json.error ?? "Failed to create team.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setCreating(false);
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
  async function deleteTeam(teamId: string) {
    if (!confirm("Delete this team? This cannot be undone.")) return;
    try {
      await fetch(`${API}/v1/teams/${teamId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (activeTeam?.id === teamId) {
        setActiveTeam(null);
        setMembers([]);
      }
      await fetchTeams();
    } catch {}
  }
  function copyInviteLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  const allTeams = [
    ...(teams.owned || []).map((t) => ({ ...t, role: "owner" })),
    ...(teams.member || []).filter(
      (m) => !(teams.owned || []).some((o) => o.id === m.id),
    ),
  ];
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Team Collaboration
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Invite teammates, manage roles, and collaborate on campaigns.
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={14} /> New Team
        </button>
      </div>
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400">
            ✕
          </button>
        </div>
      )}
      {loading ? (
        <div className="glass-card overflow-hidden">
          <LogoLoader fullPage text="Loading teams..." />
        </div>
      ) : allTeams.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users size={40} className="mx-auto mb-4 text-gray-300" />
          <p
            className="font-semibold text-sm mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            No teams yet
          </p>
          <p className="text-xs text-gray-400 mb-5">
            Create your first team to collaborate with others.
          </p>
          <button
            className="btn-primary flex items-center gap-2 mx-auto"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={14} /> Create Team
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="space-y-2">
            <p
              className="text-xs font-semibold uppercase tracking-wider px-2 mb-3"
              style={{ color: "var(--text-muted)" }}
            >
              Your Teams
            </p>
            {allTeams.map((team) => (
              <div
                key={team.id}
                onClick={() => selectTeam(team)}
                className={`glass-card p-4 cursor-pointer transition-all group hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-500/10 ${activeTeam?.id === team.id ? "border-gray-800 ring-1 ring-gray-800 shadow-sm" : "hover:border-gray-300"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 flex items-center justify-center text-gray-700 font-bold text-sm shadow-sm">
                      {team.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p
                        className="font-semibold text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {team.name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {ROLE_ICONS[team.role]}
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {ROLE_LABELS[team.role]} · {team.member_count} members
                        </span>
                      </div>
                    </div>
                  </div>
                  {team.role === "owner" && (
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTeam(team.id);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-2">
            {activeTeam ? (
              <div className="glass-card overflow-hidden">
                <div
                  className="p-5 border-b flex items-center justify-between"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div>
                    <h3
                      className="font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {activeTeam.name}
                    </h3>
                    <p className="text-xs text-gray-400">/{activeTeam.slug}</p>
                  </div>
                  {(activeTeam.role === "owner" ||
                    activeTeam.role === "admin") && (
                    <button
                      className="btn-primary flex items-center gap-2 text-sm"
                      onClick={() => setShowInvite(!showInvite)}
                    >
                      <Mail size={13} /> Invite Member
                    </button>
                  )}
                </div>
                {showInvite && (
                  <div
                    className="p-5 bg-gray-50/50 border-b space-y-3"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex gap-2">
                      <input
                        className="input flex-1"
                        type="email"
                        placeholder="teammate@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                      <select
                        className="input w-32"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as any)}
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        className="btn-primary flex items-center gap-2"
                        onClick={inviteMember}
                        disabled={inviting || !inviteEmail}
                      >
                        {inviting ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <Mail size={13} />
                        )}{" "}
                        Send
                      </button>
                    </div>
                    {inviteLink && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-gray-200 shadow-sm">
                        <span className="text-xs font-mono flex-1 truncate text-gray-600">
                          {inviteLink}
                        </span>
                        <button
                          onClick={copyInviteLink}
                          className="shrink-0 text-gray-600 hover:text-gray-900"
                        >
                          {copied ? (
                            <Check size={14} className="text-emerald-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>
                        <strong>Admin:</strong> Can invite members, view all
                        campaigns
                      </p>
                      <p>
                        <strong>Member:</strong> Can send emails, manage
                        templates
                      </p>
                      <p>
                        <strong>Viewer:</strong> Read-only access to analytics
                      </p>
                    </div>
                  </div>
                )}
                {membersLoading ? (
                  <div className="p-8 text-center text-sm text-gray-400">
                    <RefreshCw
                      size={16}
                      className="animate-spin mx-auto mb-2"
                    />{" "}
                    Loading members...
                  </div>
                ) : (
                  <div
                    className="divide-y"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                          {member.name?.[0]?.toUpperCase() ??
                            member.email[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-medium text-sm truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {member.name || member.email}
                          </p>
                          <p
                            className="text-xs truncate"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {member.email}
                          </p>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${member.role === "owner" ? "bg-gray-800 text-white border-gray-800 shadow-sm" : "bg-gray-50 text-gray-700 border-gray-200"}`}
                        >
                          {ROLE_ICONS[member.role]} {ROLE_LABELS[member.role]}
                        </div>
                        {activeTeam.role === "owner" &&
                          member.role !== "owner" && (
                            <button
                              className="text-gray-400 hover:text-red-500 transition-colors p-1 shrink-0"
                              onClick={() => removeMember(member.id)}
                            >
                              <X size={14} />
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card p-12 text-center h-full flex flex-col items-center justify-center">
                <Users size={32} className="text-gray-300 mb-3" />
                <p className="text-sm text-gray-400">
                  Select a team to view members
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {showCreate && (
        <div className="fixed inset-0 lg:left-60 z-50 flex items-center justify-center p-4 bg-gray-900/50">
          <div className="glass-card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                Create Team
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Team Name
                </label>
                <input
                  className="input"
                  placeholder="e.g. Marketing Team"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createTeam()}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  className="btn-secondary flex-1"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  onClick={createTeam}
                  disabled={creating || !newTeamName.trim()}
                >
                  {creating ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Plus size={13} />
                  )}
                  {creating ? "Creating..." : "Create Team"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
