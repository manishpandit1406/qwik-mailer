"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Building2,
  User,
  AlertCircle,
  Loader2,
  Check,
  Sparkles,
  Lock,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.qwikmailer.in";

type AccessPreset = "full" | "read_write" | "read_only" | "custom";

interface PermissionItem {
  id: string;
  scope: string;
  label: string;
  desc: string;
}

const AVAILABLE_PERMISSIONS: PermissionItem[] = [
  {
    id: "forms_write",
    scope: "forms:write",
    label: "Create & Edit Forms",
    desc: "Generate new forms with AI and edit questions, fields & styling",
  },
  {
    id: "forms_read",
    scope: "forms:read",
    label: "Read Forms & Schemas",
    desc: "View form structure, public links, and list existing forms",
  },
  {
    id: "submissions_read",
    scope: "submissions:read",
    label: "View Submissions & Responses",
    desc: "Fetch live respondent answers and submission counts",
  },
  {
    id: "forms_delete",
    scope: "forms:delete",
    label: "Delete Forms",
    desc: "Permanently delete forms and associated responses",
  },
];

function OAuthAuthorizeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const clientId = searchParams.get("client_id") || "chatgpt";
  const redirectUri = searchParams.get("redirect_uri") || "";
  const state = searchParams.get("state") || "";
  const codeChallenge = searchParams.get("code_challenge") || "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") || "S256";

  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [clientName, setClientName] = useState<string>("ChatGPT");

  // Permissions state
  const [accessPreset, setAccessPreset] = useState<AccessPreset>("full");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "forms:read",
    "forms:write",
    "submissions:read",
    "forms:delete",
  ]);

  useEffect(() => {
    const token = localStorage.getItem("mf_access_token");
    if (!token) {
      const currentUrl = window.location.pathname + window.location.search;
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }

    const storedUser = localStorage.getItem("mf_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {}
    }

    async function loadData() {
      try {
        // 1. Client info
        const clientRes = await fetch(`${API}/v1/oauth/client-info?client_id=${encodeURIComponent(clientId)}`);
        if (clientRes.ok) {
          const clientData = await clientRes.json();
          if (clientData.client_name) {
            setClientName(clientData.client_name);
          }
        }

        // 2. Teams / Projects
        const teamsRes = await fetch(`${API}/v1/teams`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          // Team lists can come from owned + member or data array
          let list: Array<{ id: string; name: string }> = [];
          if (teamsData.data) {
            if (Array.isArray(teamsData.data)) {
              list = teamsData.data;
            } else if (teamsData.data.owned || teamsData.data.member) {
              list = [...(teamsData.data.owned || []), ...(teamsData.data.member || [])];
            }
          } else if (Array.isArray(teamsData.teams)) {
            list = teamsData.teams;
          }

          if (list.length > 0) {
            setTeams(list);
            const activeStored = localStorage.getItem("mf_active_team");
            const match = list.find((t) => t.id === activeStored);
            setSelectedTeamId(match ? match.id : list[0].id);
          }
        }
      } catch (err: any) {
        console.error("Error loading oauth data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router, clientId]);

  function handlePresetChange(preset: AccessPreset) {
    setAccessPreset(preset);
    if (preset === "full") {
      setSelectedScopes(["forms:read", "forms:write", "submissions:read", "forms:delete"]);
    } else if (preset === "read_write") {
      setSelectedScopes(["forms:read", "forms:write", "submissions:read"]);
    } else if (preset === "read_only") {
      setSelectedScopes(["forms:read", "submissions:read"]);
    }
  }

  function toggleScope(scope: string) {
    setAccessPreset("custom");
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  }

  async function handleAuthorize() {
    const token = localStorage.getItem("mf_access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (selectedScopes.length === 0) {
      setError("Please select at least one permission to grant.");
      return;
    }

    setAuthorizing(true);
    setError(null);

    try {
      const res = await fetch(`${API}/v1/oauth/consent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri || "urn:ietf:wg:oauth:2.0:oob",
          team_id: selectedTeamId || undefined,
          code_challenge: codeChallenge || undefined,
          code_challenge_method: codeChallengeMethod || undefined,
          scope: selectedScopes.join(" "),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to authorize request");
      }

      if (redirectUri && redirectUri !== "urn:ietf:wg:oauth:2.0:oob") {
        const targetUrl = new URL(redirectUri);
        targetUrl.searchParams.set("code", data.code);
        if (state) {
          targetUrl.searchParams.set("state", state);
        }
        window.location.href = targetUrl.toString();
      } else {
        setSuccessCode(data.code);
        setAuthorizing(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setAuthorizing(false);
    }
  }

  function handleCancel() {
    if (redirectUri && redirectUri !== "urn:ietf:wg:oauth:2.0:oob") {
      try {
        const targetUrl = new URL(redirectUri);
        targetUrl.searchParams.set("error", "access_denied");
        if (state) {
          targetUrl.searchParams.set("state", state);
        }
        window.location.href = targetUrl.toString();
        return;
      } catch {}
    }
    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading connection details...</p>
      </div>
    );
  }

  if (successCode) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Successfully Authorized!</h2>
            <p className="text-xs text-slate-500">
              {clientName} has been connected to your Qwik Mailer account.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-1">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Authorization Code</p>
            <p className="text-xs font-mono text-slate-800 break-all select-all">{successCode}</p>
          </div>
          <p className="text-xs text-slate-500">
            You can close this window and return to {clientName}.
          </p>
          <button
            onClick={() => router.push("/dashboard/settings")}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition"
          >
            Go to Qwik Mailer Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        {/* Brand connection header */}
        <div className="flex items-center justify-center space-x-4 pt-1">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
            QM
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
            {clientName === "ChatGPT" ? (
              <span className="text-emerald-600 font-extrabold text-xs">GPT</span>
            ) : clientName === "Claude" ? (
              <span className="text-amber-600 font-extrabold text-xs">Claude</span>
            ) : (
              <Sparkles className="w-5 h-5 text-indigo-600" />
            )}
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Connect <span className="text-indigo-600">{clientName}</span> to Qwik Mailer
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Authorize {clientName} to access and manage web forms on your Qwik Mailer account.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* User & Project selector */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3.5">
          <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200">
            <span className="text-slate-500 flex items-center space-x-1.5 font-medium">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Account:</span>
            </span>
            <span className="font-semibold text-slate-800 truncate max-w-[200px]">
              {user?.email || "Signed In"}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Select Project / Team to Connect:</span>
            </label>
            {teams.length > 0 ? (
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-xs"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 font-medium">
                Default Project (Septet Labs)
              </div>
            )}
            <p className="text-[11px] text-slate-500">
              Only forms and submissions within this project will be accessible.
            </p>
          </div>
        </div>

        {/* Granular Permissions Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Access Level & Permissions:</span>
            </label>
            <span className="text-[11px] font-medium text-slate-500">
              {selectedScopes.length} of {AVAILABLE_PERMISSIONS.length} selected
            </span>
          </div>

          {/* Access level presets */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => handlePresetChange("full")}
              className={`py-1.5 rounded-lg transition text-center ${
                accessPreset === "full"
                  ? "bg-white text-indigo-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Full Control
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("read_write")}
              className={`py-1.5 rounded-lg transition text-center ${
                accessPreset === "read_write"
                  ? "bg-white text-indigo-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Read & Write
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("read_only")}
              className={`py-1.5 rounded-lg transition text-center ${
                accessPreset === "read_only"
                  ? "bg-white text-indigo-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Read Only
            </button>
          </div>

          {/* Checkbox list */}
          <div className="space-y-2 pt-1">
            {AVAILABLE_PERMISSIONS.map((perm) => {
              const checked = selectedScopes.includes(perm.scope);
              return (
                <div
                  key={perm.id}
                  onClick={() => toggleScope(perm.scope)}
                  className={`flex items-start space-x-3 p-2.5 rounded-xl border transition cursor-pointer ${
                    checked
                      ? "bg-indigo-50/40 border-indigo-200 text-slate-900"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center transition shrink-0 ${
                      checked
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-300 bg-white"
                    }`}
                  >
                    {checked && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900">{perm.label}</p>
                    <p className="text-[11px] text-slate-500 leading-normal">{perm.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-2 flex items-center space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={authorizing}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAuthorize}
            disabled={authorizing}
            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-sm transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
          >
            {authorizing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Authorizing...</span>
              </>
            ) : (
              <span>Authorize Access</span>
            )}
          </button>
        </div>

        <p className="text-[11px] text-center text-slate-400">
          You can revoke or disconnect access anytime from Qwik Mailer Project Settings.
        </p>
      </div>
    </div>
  );
}

export default function OAuthAuthorizePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-xs">
          Loading authorization...
        </div>
      }
    >
      <OAuthAuthorizeContent />
    </Suspense>
  );
}
