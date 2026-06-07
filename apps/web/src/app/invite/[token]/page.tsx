"use client";
import { formatIST } from "@/lib/dateUtils";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface InviteDetails {
  teamName: string;
  inviterName: string;
  role: string;
  email: string;
  expiresAt: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/v1/teams/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setInvite(data.data);
        else setError(data.error || "Invite not found or expired.");
      })
      .catch(() => setError("Could not load invite details."))
      .finally(() => setLoading(false));
  }, [token]);

  async function acceptInvite() {
    setAccepting(true);
    const jwt =
      typeof window !== "undefined"
        ? localStorage.getItem("mf_access_token")
        : null;

    if (!jwt) {
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    const res = await fetch(`${API}/v1/teams/invite/${token}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const data = await res.json();
    if (data.success) {
      if (data.data?.teamId) {
        localStorage.setItem("mf_active_team", data.data.teamId);
      }
      setDone(true);
      setTimeout(() => router.push("/dashboard/team"), 2000);
    } else {
      setError(data.error || "Failed to accept invite.");
    }
    setAccepting(false);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg-primary, #0f1117)" }}
    >
      <div
        className="glass-card w-full max-w-md p-8 animate-fade-up"
        style={{ animationDuration: "0.3s" }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <span
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            ✉️ Qwik Mailer
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <RefreshCw size={24} className="animate-spin text-indigo-500" />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Loading invite...
            </p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && !done && (
          <div className="text-center py-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--bg-secondary)" }}
            >
              <AlertCircle size={24} className="text-red-500" />
            </div>
            <p
              className="font-semibold text-base mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              Invalid Invite
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              {error}
            </p>
            <a href="/login" className="btn-primary w-full block text-center">
              Go to Login
            </a>
          </div>
        )}

        {/* Success state */}
        {done && (
          <div className="text-center py-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-emerald-50"
            >
              <CheckCircle2 size={24} className="text-emerald-500" />
            </div>
            <p
              className="font-semibold text-base mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              You&apos;re in! 🎉
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Redirecting to your teams...
            </p>
          </div>
        )}

        {/* Invite details */}
        {!loading && !error && !done && invite && (
          <>
            {/* Icon */}
            <div className="flex flex-col items-center mb-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "var(--bg-secondary)" }}
              >
                <Users size={24} className="text-indigo-500" />
              </div>
              <h1
                className="text-lg font-bold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                You&apos;re invited!
              </h1>
              <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                  {invite.inviterName}
                </span>{" "}
                invited you to join a team
              </p>
            </div>

            {/* Details table */}
            <div
              className="rounded-xl mb-6 overflow-hidden border"
              style={{ borderColor: "var(--border)" }}
            >
              {[
                { label: "Team", value: invite.teamName, bold: true },
                {
                  label: "Your role",
                  value: (
                    <span className="badge-info capitalize">{invite.role}</span>
                  ),
                },
                { label: "Invited by", value: invite.inviterName },
                {
                  label: "Expires",
                  value: formatIST(invite.expiresAt, false),
                },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    borderBottom:
                      i < 3 ? "1px solid var(--border)" : undefined,
                    background: "var(--bg-secondary)",
                  }}
                >
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {row.label}
                  </span>
                  <span
                    className={`text-sm ${row.bold ? "font-semibold" : ""}`}
                    style={{ color: "var(--text-primary)" }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={acceptInvite}
              disabled={accepting}
              className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
            >
              {accepting && <RefreshCw size={14} className="animate-spin" />}
              {accepting ? "Accepting..." : "Accept Invitation →"}
            </button>

            <p
              className="text-center text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              You&apos;ll need to be logged in to accept. New to Qwik Mailer?{" "}
              <a
                href="/register"
                className="text-indigo-500 hover:text-indigo-400 font-medium"
              >
                Create an account
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
