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

function OpenAILogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.02-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4022-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813v6.7227zm1.1448-1.9213l2.55-1.4716 2.55 1.4716v2.9433l-2.55 1.4716-2.55-1.4716v-2.9433z"/>
    </svg>
  );
}

function ClaudeLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.41 12.79a33.58 33.58 0 0 0 4.79-1.07 1 1 0 0 0 .62-1.25 1 1 0 0 0-.91-.71c-1.83-.09-3.66.19-5.42.84a14.28 14.28 0 0 1 .92-2.31c.88-1.7 1.95-3.3 3.19-4.77a1 1 0 0 0-.15-1.41 1 1 0 0 0-1.41.15c-1.12 1.41-2.09 2.94-2.88 4.56-.47.96-.86 1.96-1.17 2.98-.67-1.42-1.55-2.74-2.61-3.92a1 1 0 0 0-1.46 0 1 1 0 0 0 0 1.46c1.15 1.25 2.08 2.68 2.76 4.23a15.7 15.7 0 0 1-2.45-.63c-1.74-.6-3.4-1.39-4.96-2.35a1 1 0 0 0-1.37.36 1 1 0 0 0 .36 1.37c1.47.91 3.03 1.66 4.67 2.23.8.28 1.62.49 2.45.64a13.9 13.9 0 0 1-1.63 1.83c-1.34 1.25-2.83 2.33-4.44 3.21a1 1 0 0 0-.43 1.35 1 1 0 0 0 1.35.43c1.55-.84 2.98-1.87 4.26-3.07.67-.63 1.29-1.32 1.84-2.05.24 1.54.67 3.04 1.27 4.48a1 1 0 0 0 1.25.56 1 1 0 0 0 .56-1.25c-.64-1.49-1.07-3.06-1.28-4.67a14.4 14.4 0 0 1 2.22 1.2c1.54 1.01 2.94 2.21 4.17 3.56a1 1 0 0 0 1.41.08 1 1 0 0 0 .08-1.41c-1.22-1.33-2.6-2.51-4.11-3.5-.7-.46-1.44-.86-2.2-1.2z" />
    </svg>
  );
}

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
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-2.5 shadow-xs flex items-center justify-center">
            <img
              src="/qwikmailer-icon.png"
              alt="Qwik Mailer"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-2.5 shadow-xs flex items-center justify-center">
            {clientName.toLowerCase().includes("chatgpt") || clientId.toLowerCase().includes("chatgpt") ? (
              <OpenAILogo className="w-8 h-8 text-[#10a37f]" />
            ) : clientName.toLowerCase().includes("claude") || clientId.toLowerCase().includes("claude") ? (
              <ClaudeLogo className="w-8 h-8 text-[#D97757]" />
            ) : (
              <Sparkles className="w-7 h-7 text-indigo-600" />
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
