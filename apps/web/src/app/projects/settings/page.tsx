"use client";
import { formatIST } from "@/lib/dateUtils";
import { useState, useEffect, useRef } from "react";
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Zap,
  CheckCircle2,
  ChevronRight,
  Code,
  X,
  RefreshCw,
  ChevronLeft,
  Trash2,
} from "lucide-react";
import { LogoLoader } from "@/components/LogoLoader";
import { startRegistration } from "@simplewebauthn/browser";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("mf_access_token") ?? "")
    : "";
}
export default function SettingsPage() {
  const [tab, setTab] = useState<
    "profile" | "security" | "notifications"
  >("profile");
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    companyName: "",
    websiteUrl: "",
    phoneNumber: "",
    useCase: "",
    plan: "free",
    reputationScore: 100,
    totpEnabled: false,
    monthlyEmailCount: 0,
    planLimit: 1000,
    dailyEmailCount: 0,
    dailyLimit: null as number | null,
    billingPeriodStart: null as string | null,
    companyAddress: "",
    companyAddress2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const plansScrollRef = useRef<HTMLDivElement>(null);

  const scrollPlans = (direction: "left" | "right") => {
    if (plansScrollRef.current) {
      const { scrollLeft, clientWidth } = plansScrollRef.current;
      const scrollTo =
        direction === "left"
          ? scrollLeft - clientWidth * 0.8
          : scrollLeft + clientWidth * 0.8;
      plansScrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");

  const [totpStep, setTotpStep] = useState<"idle" | "setup">("idle");
  const [totpQr, setTotpQr] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpMsg, setTotpMsg] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);

  
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [deletingPasskey, setDeletingPasskey] = useState<string | null>(null);
  const [passkeyToDelete, setPasskeyToDelete] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteTotp, setDeleteTotp] = useState("");
  const [passkeyMsg, setPasskeyMsg] = useState("");

  async function loadPasskeys() {
    try {
      const res = await fetch(`${API}/v1/auth/passkey`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setPasskeys(data);
    } catch { }
  }

  useEffect(() => {
    if (tab === "security") {
      loadPasskeys();
    }
  }, [tab]);

  async function registerPasskey() {
    setPasskeyLoading(true);
    setPasskeyMsg("");
    try {
      // 1. Get options from server
      const optRes = await fetch(`${API}/v1/auth/passkey/register-options`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const options = await optRes.json();
      
      if (options.error) {
        throw new Error(options.error);
      }

      // 2. Pass to browser
      const attResp = await startRegistration(options);

      // 3. Verify with server
      const verRes = await fetch(`${API}/v1/auth/passkey/register-verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(attResp),
      });

      const verification = await verRes.json();
      if (verification.verified) {
        setPasskeyMsg("Passkey registered successfully!");
        loadPasskeys();
      } else {
        setPasskeyMsg(verification.error || "Registration failed");
      }
    } catch (err: any) {
      setPasskeyMsg(err.message || "Something went wrong.");
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function executeDeletePasskey() {
    if (!passkeyToDelete) return;
    setDeletingPasskey(passkeyToDelete);
    setPasskeyMsg("");
    try {
      const res = await fetch(`${API}/v1/auth/passkey/${passkeyToDelete}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          password: deletePassword || undefined,
          totpCode: deleteTotp || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPasskeyMsg("Passkey removed.");
        setPasskeyToDelete(null);
        setDeletePassword("");
        setDeleteTotp("");
        loadPasskeys();
      } else {
        setPasskeyMsg(data.error || "Failed to remove passkey");
      }
    } catch (err: any) {
      setPasskeyMsg(err.message || "Failed to remove passkey");
    } finally {
      setDeletingPasskey(null);
    }
  }

  async function deleteWithPasskey() {
    if (!passkeyToDelete) return;
    setDeletingPasskey(passkeyToDelete);
    setPasskeyMsg("");
    try {
      // Step 1: Get challenge
      const optionsRes = await fetch(`${API}/v1/auth/passkey/delete-options`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const options = await optionsRes.json();
      if (options.error) throw new Error(options.error);

      // Step 2: Trigger native browser biometric prompt
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const webauthnResponse = await startAuthentication({ optionsJSON: options });

      // Step 3: Send signed response to delete endpoint
      const res = await fetch(`${API}/v1/auth/passkey/${passkeyToDelete}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ webauthnResponse }),
      });
      const data = await res.json();
      if (data.success) {
        setPasskeyMsg("Passkey removed.");
        setPasskeyToDelete(null);
        setDeletePassword("");
        setDeleteTotp("");
        loadPasskeys();
      } else {
        setPasskeyMsg(data.error || "Failed to remove passkey");
      }
    } catch (err: any) {
      setPasskeyMsg(err.message || "Failed to remove passkey");
    } finally {
      setDeletingPasskey(null);
    }
  }

const [notifSaved, setNotifSaved] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState([
    true,
    true,
    true,
    false,
    false,
  ]);

  const [showRepLogs, setShowRepLogs] = useState(false);
  const [repLogs, setRepLogs] = useState<any[]>([]);
  const [repLogsLoading, setRepLogsLoading] = useState(false);
  async function loadReputationLogs() {
    setShowRepLogs(true);
    setRepLogsLoading(true);
    try {
      const res = await fetch(`${API}/v1/auth/me/reputation-logs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setRepLogs(json.data);
    } catch {
      // ignore
    } finally {
      setRepLogsLoading(false);
    }
  }
  const tabs = [
    { id: "profile", label: "Profile", icon: <User size={15} /> },
    { id: "security", label: "Security", icon: <Shield size={15} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={15} /> },
  ] as const;
  // Load real user profile from API
  useEffect(() => {
    async function loadProfile() {
      setProfileLoading(true);
      try {
        const res = await fetch(`${API}/v1/auth/me`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const json = await res.json();
        if (json.success) {
          setProfile({
            name: json.data.name ?? "",
            email: json.data.email ?? "",
            companyName: json.data.companyName ?? "",
            websiteUrl: json.data.websiteUrl ?? "",
            phoneNumber: json.data.phoneNumber ?? "",
            useCase: json.data.useCase ?? "",
            plan: json.data.plan ?? "free",
            reputationScore: json.data.reputationScore ?? 100,
            totpEnabled: json.data.totpEnabled ?? false,
            monthlyEmailCount: json.data.monthlyEmailCount ?? 0,
            planLimit: json.data.planLimit ?? 3000,
            dailyEmailCount: json.data.dailyEmailCount ?? 0,
            dailyLimit: json.data.dailyLimit ?? null,
            billingPeriodStart: json.data.billingPeriodStart ?? null,
            companyAddress: json.data.companyAddress ?? "",
            companyAddress2: json.data.companyAddress2 ?? "",
            city: json.data.city ?? "",
            state: json.data.state ?? "",
            zipCode: json.data.zipCode ?? "",
            country: json.data.country ?? "",
          });
          // Update localStorage too
          localStorage.setItem(
            "mf_user",
            JSON.stringify({ name: json.data.name, email: json.data.email }),
          );
        }
      } catch {
        setProfileError("Failed to load profile.");
      } finally {
        setProfileLoading(false);
      }
    }
    loadProfile();
  }, []);
  async function saveProfile() {
    setSaving(true);
    setProfileError("");
    try {
      const res = await fetch(`${API}/v1/auth/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          name: profile.name,
          companyAddress: profile.companyAddress,
          companyAddress2: profile.companyAddress2,
          city: profile.city,
          state: profile.state,
          zipCode: profile.zipCode,
          country: profile.country,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setProfileError(json.error ?? "Failed to update profile.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      localStorage.setItem(
        "mf_user",
        JSON.stringify({ name: profile.name, email: profile.email }),
      );
    } catch {
      setProfileError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  async function changePassword() {
    setPwError("");
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`${API}/v1/auth/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!json.success) {
        setPwError(json.error ?? "Failed to change password.");
        return;
      }
      setPwSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwSaved(false), 2500);
    } catch {
      setPwError("Network error. Please try again.");
    } finally {
      setPwSaving(false);
    }
  }
  async function startTotpSetup() {
    setTotpLoading(true);
    setTotpMsg("");
    try {
      const res = await fetch(`${API}/v1/auth/totp/setup`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setTotpQr(json.data.qrCodeUrl);
        setTotpSecret(json.data.secret);
        setTotpStep("setup");
      } else {
        setTotpMsg(json.error ?? "Failed to setup 2FA");
      }
    } catch {
      setTotpMsg("Network error");
    } finally {
      setTotpLoading(false);
    }
  }
  async function verifyTotp() {
    setTotpLoading(true);
    setTotpMsg("");
    try {
      const res = await fetch(`${API}/v1/auth/totp/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ secret: totpSecret, token: totpCode }),
      });
      const json = await res.json();
      if (json.success) {
        setProfile({ ...profile, totpEnabled: true });
        setTotpStep("idle");
        setTotpCode("");
        setTotpMsg("2FA enabled successfully");
        setTimeout(() => setTotpMsg(""), 3000);
      } else {
        setTotpMsg(json.error ?? "Invalid code");
      }
    } catch {
      setTotpMsg("Network error");
    } finally {
      setTotpLoading(false);
    }
  }
  async function disableTotp() {
    if (!totpCode) {
      setTotpMsg("Please enter an authenticator code to disable 2FA");
      return;
    }
    setTotpLoading(true);
    setTotpMsg("");
    try {
      const res = await fetch(`${API}/v1/auth/totp/disable`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: totpCode }),
      });
      const json = await res.json();
      if (json.success) {
        setProfile({ ...profile, totpEnabled: false });
        setTotpCode("");
        setTotpMsg("2FA disabled successfully");
        setTimeout(() => setTotpMsg(""), 3000);
      } else {
        setTotpMsg(json.error ?? "Invalid code");
      }
    } catch {
      setTotpMsg("Network error");
    } finally {
      setTotpLoading(false);
    }
  }
  return (
    <div className="space-y-5  max-w-5xl">
      <div>
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          Settings
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Manage your account and preferences.
        </p>
      </div>
      <div className="flex gap-5">
        {/* Sidebar tabs */}
        <div className="w-44 shrink-0 space-y-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`nav-item w-full text-left ${tab === t.id ? "active" : ""}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 glass-card p-6 min-w-0">
          {tab === "profile" && (
            <div className="space-y-5">
              <h3
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Profile Information
              </h3>
              {profileLoading ? (
                <div className="py-4">
                  <LogoLoader size="sm" text="Loading profile..." />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold bg-indigo-600 text-white">
                      {profile.name?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <div>
                      <p
                        className="font-semibold text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {profile.name}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {profile.email}
                      </p>
                    </div>
                  </div>
                  {profileError && (
                    <p className="text-sm text-red-600">{profileError}</p>
                  )}
                  <div className="grid gap-4">
                    <div>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Full Name
                      </label>
                      <input
                        className="input"
                        value={profile.name}
                        onChange={(e) =>
                          setProfile({ ...profile, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Email Address
                      </label>
                      <input
                        className="input"
                        type="email"
                        value={profile.email}
                        disabled
                        style={{ opacity: 0.6, cursor: "not-allowed" }}
                      />
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Email cannot be changed. Contact support if needed.
                      </p>
                    </div>

                    <div className="pt-4 mt-2 border-t" style={{ borderColor: "var(--border)" }}>
                      <h4 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>Workspace Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Company / Organization Name</label>
                          <input className="input" type="text" value={profile.companyName} disabled style={{ opacity: 0.7, cursor: "not-allowed" }} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Website URL</label>
                          <input className="input" type="text" value={profile.websiteUrl || "Not provided"} disabled style={{ opacity: 0.7, cursor: "not-allowed" }} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Phone Number</label>
                          <input className="input" type="text" value={profile.phoneNumber} disabled style={{ opacity: 0.7, cursor: "not-allowed" }} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-2 border-t" style={{ borderColor: "var(--border)" }}>
                      <h4 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>Address & Billing Details</h4>
                      <div className="grid gap-4">
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Address Line 1</label>
                          <input className="input" type="text" value={profile.companyAddress} onChange={(e) => setProfile({ ...profile, companyAddress: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Address Line 2 (Optional)</label>
                          <input className="input" type="text" value={profile.companyAddress2} onChange={(e) => setProfile({ ...profile, companyAddress2: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>City</label>
                            <input className="input" type="text" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>State/Province</label>
                            <input className="input" type="text" value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>ZIP Code</label>
                            <input className="input" type="text" value={profile.zipCode} onChange={(e) => setProfile({ ...profile, zipCode: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Country</label>
                            <input className="input" type="text" value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Reputation Score
                      </label>
                      <button
                        onClick={loadReputationLogs}
                        className="w-full text-left flex items-center gap-3 p-2 -ml-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                      >
                        <div className="flex-1 h-2 rounded-full overflow-hidden bg-gray-200">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${profile.reputationScore}%`,
                              background:
                                profile.reputationScore >= 70
                                  ? "#10b981"
                                  : profile.reputationScore >= 40
                                    ? "#f59e0b"
                                    : "#ef4444",
                            }}
                          />
                        </div>
                        <span
                          className="text-sm font-bold group-hover:underline"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {profile.reputationScore}/100
                        </span>
                      </button>
                    </div>
                  </div>
                  <button
                    className="btn-primary flex items-center gap-2"
                    onClick={saveProfile}
                    disabled={saving}
                  >
                    {saving ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : null}
                    {saved ? (
                      <>
                        <CheckCircle2 size={14} /> Saved!
                      </>
                    ) : saving ? (
                      "Saving..."
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </>
              )}
            </div>
          )}
          {tab === "security" && (
            <div className="space-y-5">
              <h3
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Security Settings
              </h3>
              <div className="space-y-4">
                {pwError && <p className="text-sm text-red-600">{pwError}</p>}
                {pwSaved && (
                  <p className="text-sm text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Password changed successfully!
                  </p>
                )}
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Current Password
                  </label>
                  <input
                    className="input"
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    New Password
                  </label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Confirm New Password
                  </label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <button
                  className="btn-primary flex items-center gap-2"
                  onClick={changePassword}
                  disabled={pwSaving || !currentPassword || !newPassword}
                >
                  {pwSaving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : null}
                  {pwSaving ? "Updating..." : "Update Password"}
                </button>
              </div>
              <hr className="divider" />
              <div>
                <p
                  className="font-medium text-sm mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  Active Sessions
                </p>
                <div className="p-3 rounded-xl text-sm bg-indigo-50 border border-indigo-100">
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>
                      Current session
                    </span>
                    <span className="badge-success">Active</span>
                  </div>
                </div>
              </div>
              <hr className="divider" />
              <div>
                <p
                  className="font-medium text-sm mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  Two-Factor Authentication (2FA)
                </p>
                <p
                  className="text-xs mb-3"
                  style={{ color: "var(--text-muted)" }}
                >
                  Protect your account with an extra layer of security using an
                  authenticator app.
                </p>
                {totpMsg && (
                  <p className="text-sm mb-3 font-medium text-emerald-600 bg-emerald-50 p-2 rounded-lg">
                    {totpMsg}
                  </p>
                )}
                {profile.totpEnabled ? (
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-700">
                        2FA is currently enabled
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        className="input max-w-[150px] !py-1.5 !text-sm"
                        placeholder="123456"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                      />
                      <button
                        className="btn-danger py-1.5 px-3 text-sm"
                        onClick={disableTotp}
                        disabled={totpLoading || !totpCode}
                      >
                        {totpLoading ? "Disabling..." : "Disable 2FA"}
                      </button>
                    </div>
                    <p className="text-xs text-emerald-600 mt-2">
                      Enter an active code from your app to disable.
                    </p>
                  </div>
                ) : totpStep === "idle" ? (
                  <button
                    className="btn-secondary text-sm"
                    onClick={startTotpSetup}
                    disabled={totpLoading}
                  >
                    {totpLoading ? "Loading..." : "Enable 2FA"}
                  </button>
                ) : (
                  <div className="p-4 rounded-xl border border-gray-200 bg-white">
                    <p
                      className="text-sm font-semibold mb-2"
                      style={{ color: "var(--text-primary)" }}
                    >
                      Setup Instructions
                    </p>
                    <ol
                      className="list-decimal pl-4 text-xs space-y-1 mb-4"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <li>
                        Install an authenticator app like Google Authenticator
                        or Authy.
                      </li>
                      <li>Scan the QR code below.</li>
                      <li>Enter the 6-digit code generated by the app.</li>
                    </ol>
                    <div className="flex gap-4">
                      {totpQr && (
                        <img
                          src={totpQr}
                          alt="QR Code"
                          className="w-24 h-24 rounded-lg border border-gray-200 p-1"
                        />
                      )}
                      <div className="flex-1 flex flex-col justify-end">
                        <label
                          className="block text-xs font-medium mb-1.5"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Authenticator Code
                        </label>
                        <div className="flex gap-2">
                          <input
                            className="input flex-1"
                            placeholder="123456"
                            value={totpCode}
                            onChange={(e) => setTotpCode(e.target.value)}
                          />
                          <button
                            className="btn-primary"
                            onClick={verifyTotp}
                            disabled={totpLoading || !totpCode}
                          >
                            {totpLoading ? "Verifying..." : "Verify & Enable"}
                          </button>
                        </div>
                        <button
                          className="btn-ghost text-xs self-start mt-2"
                          onClick={() => {
                            setTotpStep("idle");
                            setTotpMsg("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PASSKEYS SECTION */}
              <hr className="divider" />
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: "var(--text-primary)" }}>
                  Passkeys (Passwordless Login)
                </p>
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                  Use Touch ID, Face ID, or a security key to sign in securely without a password.
                </p>
                {passkeyMsg && (
                  <p className="text-sm mb-3 font-medium text-blue-600 bg-blue-50 p-2 rounded-lg">
                    {passkeyMsg}
                  </p>
                )}
                
                {passkeys.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {passkeys.map((pk: any) => (
                      <div key={pk.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-between group transition-colors hover:border-gray-300">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 mb-1">
                            {pk.deviceName || pk.deviceType || "Passkey"}
                            {pk.browser && <span className="ml-2 font-normal text-gray-500">· {pk.browser}</span>}
                            {pk.deviceOs && <span className="ml-2 font-normal text-gray-500">· {pk.deviceOs}</span>}
                          </p>
                          <p className="text-xs text-gray-500 flex gap-3">
                            <span>Added: {formatIST(pk.createdAt, false)}</span>
                            {pk.ipAddress && <span>IP: {pk.ipAddress}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <CheckCircle2 size={18} className="text-emerald-500" />
                          <button
                            onClick={() => setPasskeyToDelete(pk.id)}
                            disabled={deletingPasskey === pk.id}
                            className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Remove Passkey"
                          >
                            {deletingPasskey === pk.id ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {passkeyToDelete && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                      <button onClick={() => setPasskeyToDelete(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <X size={20} />
                      </button>
                      <h3 className="text-xl font-bold mb-2">Verify Deletion</h3>
                      <p className="text-sm text-gray-600 mb-5">
                        Confirm your identity to remove this passkey. Use any one of the methods below.
                      </p>

                      {/* Passkey Button */}
                      <button
                        onClick={deleteWithPasskey}
                        disabled={deletingPasskey !== null}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-4 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition-all"
                        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                      >
                        {deletingPasskey ? <RefreshCw size={16} className="animate-spin" /> : <Shield size={16} />}
                        {deletingPasskey ? "Verifying..." : "Use Passkey (Touch ID / Face ID)"}
                      </button>

                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 uppercase font-semibold">Or</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      
                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                          <input
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Your account password"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="text-center text-xs text-gray-400 uppercase font-semibold">Or</div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">2FA Code</label>
                          <input
                            type="text"
                            value={deleteTotp}
                            onChange={(e) => setDeleteTotp(e.target.value)}
                            placeholder="6-digit authenticator code"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => setPasskeyToDelete(null)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={executeDeletePasskey}
                          disabled={deletingPasskey !== null || (!deletePassword && !deleteTotp)}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          {deletingPasskey ? "Removing..." : "Remove Passkey"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  className="btn-secondary text-sm flex items-center gap-2"
                  onClick={registerPasskey}
                  disabled={passkeyLoading}
                >
                  {passkeyLoading ? <RefreshCw size={14} className="animate-spin" /> : <Shield size={14} />}
                  {passkeyLoading ? "Setting up..." : "Register New Passkey"}
                </button>
              </div>
            </div>
          )}
          {tab === "notifications" && (
            <div className="space-y-5">
              <h3
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Notification Preferences
              </h3>
              <div className="space-y-3">
                {[
                  {
                    label: "Delivery failures",
                    desc: "Get notified when emails fail to deliver",
                  },
                  {
                    label: "High bounce rate",
                    desc: "Alert when bounce rate exceeds 5%",
                  },
                  {
                    label: "Domain expiry",
                    desc: "Remind me before domain verification expires",
                  },
                  {
                    label: "Usage limits",
                    desc: "Warn when nearing monthly email limits",
                  },
                  {
                    label: "Weekly digest",
                    desc: "Receive weekly analytics summary email",
                  },
                ].map(({ label, desc }, i) => (
                  <div
                    key={label}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200"
                  >
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {label}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {desc}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs[i]}
                        onChange={() =>
                          setNotifPrefs((prev) =>
                            prev.map((v, idx) => (idx === i ? !v : v)),
                          )
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 rounded-full peer-checked:bg-indigo-600 peer-focus:ring-2 peer-focus:ring-indigo-500/30 transition-all bg-gray-300" />
                      <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all peer-checked:translate-x-5" />
                    </label>
                  </div>
                ))}
              </div>
              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => {
                  setNotifSaved(true);
                  setTimeout(() => setNotifSaved(false), 2000);
                }}
              >
                {notifSaved ? (
                  <>
                    <CheckCircle2 size={14} /> Saved!
                  </>
                ) : (
                  "Save Preferences"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Reputation Logs Modal */}
      {showRepLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl overflow-hidden border border-black/10">
            <div className="flex items-center justify-between p-4 border-b border-black/10">
              <h3
                className="font-bold text-lg"
                style={{ color: "var(--text-primary)" }}
              >
                Reputation Score Breakdown
              </h3>
              <button
                onClick={() => setShowRepLogs(false)}
                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={20} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {repLogsLoading ? (
                <div
                  className="py-8 flex flex-col items-center justify-center text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  <RefreshCw
                    size={24}
                    className="animate-spin mb-3 text-indigo-500"
                  />{" "}
                  Loading logs...
                </div>
              ) : repLogs.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield size={24} />
                  </div>
                  <p
                    className="font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Your reputation is perfect!
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    No points have been deducted.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {repLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-black/5"
                    >
                      <div
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${log.points > 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
                      >
                        {log.points > 0 ? "+" : ""}
                        {log.points}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-medium text-sm truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {log.reason}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {formatIST(log.createdAt, false)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
