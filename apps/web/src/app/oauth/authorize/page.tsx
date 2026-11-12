"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ShieldCheck, CheckCircle2, ArrowRight, Building2, User, AlertCircle, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.qwikmailer.in";

function OAuthAuthorizeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const clientId = searchParams.get("client_id") || "claude";
  const redirectUri = searchParams.get("redirect_uri") || "";
  const state = searchParams.get("state") || "";
  const codeChallenge = searchParams.get("code_challenge") || "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") || "S256";
  const scope = searchParams.get("scope") || "forms:read forms:write";

  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [clientName, setClientName] = useState<string>("Claude / AI Assistant");

  useEffect(() => {
    const token = localStorage.getItem("mf_access_token");
    if (!token) {
      // Redirect to login, then come back to authorize
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

    // Fetch Client info & User's Teams
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

        // 2. Teams
        const teamsRes = await fetch(`${API}/v1/teams`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          const list = teamsData.data || teamsData.teams || [];
          setTeams(list);
          if (list.length > 0) {
            setSelectedTeamId(list[0].id);
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

  async function handleAuthorize() {
    if (!redirectUri) {
      setError("Missing redirect_uri in request parameters.");
      return;
    }

    const token = localStorage.getItem("mf_access_token");
    if (!token) {
      router.push("/login");
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
          redirect_uri: redirectUri,
          team_id: selectedTeamId,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          scope,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to authorize request");
      }

      // Redirect back to client callback
      const targetUrl = new URL(redirectUri);
      targetUrl.searchParams.set("code", data.code);
      if (state) {
        targetUrl.searchParams.set("state", state);
      }

      window.location.href = targetUrl.toString();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setAuthorizing(false);
    }
  }

  function handleCancel() {
    if (redirectUri) {
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm text-slate-400">Loading authorization details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* App connection icons */}
        <div className="flex items-center justify-center space-x-4 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-xl font-bold text-white tracking-wider">QM</span>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500" />
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-1.5">
          <h1 className="text-xl font-semibold text-white">
            Connect <span className="text-indigo-400">{clientName}</span> to Qwik Mailer
          </h1>
          <p className="text-xs text-slate-400">
            This will allow {clientName} to create forms and view submissions on your behalf.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start space-x-2 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* User Account & Team selection */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Signed in as:</span>
            </span>
            <span className="font-medium text-slate-200 truncate max-w-[180px]">
              {user?.email || "User"}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Connect to Team:</span>
            </label>
            {teams.length > 0 ? (
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-slate-400 italic">Default Team</p>
            )}
          </div>
        </div>

        {/* Permissions list */}
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-slate-300">Permissions requested:</p>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Create, edit, and publish web forms & surveys via AI</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>View live form responses and respondent submissions</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Access restricted strictly to the selected team</span>
            </li>
          </ul>
        </div>

        {/* Buttons */}
        <div className="pt-2 flex items-center space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={authorizing}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAuthorize}
            disabled={authorizing}
            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
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

        <p className="text-[11px] text-center text-slate-500 pt-1">
          You can revoke this access anytime from your Qwik Mailer Settings.
        </p>
      </div>
    </div>
  );
}

export default function OAuthAuthorizePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
          Loading...
        </div>
      }
    >
      <OAuthAuthorizeContent />
    </Suspense>
  );
}
