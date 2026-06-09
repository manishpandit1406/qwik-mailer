"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  SendHorizonal,
  FileSpreadsheet,
  Mail,
  Clock,
  BarChart3,
  Globe,
  Award,
  FileText,
  Ban,
  Key,
  Webhook,
  Settings,
  Zap,
  LogOut,
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  Sparkles,
  GitBranch,
  Users,
  Paperclip,
  BookOpen,
  FilePlus,
  Network,
  LifeBuoy,
  Shield,
  ShieldAlert,
  ClipboardList,
  BookUser,
  FlaskConical,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Select } from "@/components/Select";
import { useRole } from "@/lib/useRole";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: <LayoutDashboard size={16} />,
  },
  {
    label: "Send Email",
    href: "/dashboard/send",
    icon: <SendHorizonal size={16} />,
  },
  { label: "Email Logs", href: "/dashboard/logs", icon: <Mail size={16} /> },
  { label: "Test Inbox", href: "/dashboard/sandbox", icon: <FlaskConical size={16} /> },
  {
    label: "Scheduled",
    href: "/dashboard/scheduled",
    icon: <Clock size={16} />,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: <BarChart3 size={16} />,
  },
  {
    label: "Attachments",
    href: "/dashboard/certificates",
    icon: <Paperclip size={16} />,
  },
  {
    label: "Templates",
    href: "/dashboard/templates",
    icon: <FileText size={16} />,
  },
  {
    label: "Forms",
    href: "/dashboard/forms",
    icon: <ClipboardList size={16} />,
  },
  {
    label: "Contacts",
    href: "/dashboard/contacts",
    icon: <BookUser size={16} />,
  },
  {
    label: "Team Members",
    href: "/dashboard/team",
    icon: <Users size={16} />,
  },
  {
    label: "Sender Identities",
    href: "/dashboard/senders",
    icon: <Mail size={16} />,
  },
  {
    label: "Suppression List",
    href: "/dashboard/suppression",
    icon: <Ban size={16} />,
  },
  { label: "API Keys", href: "/dashboard/api-keys", icon: <Key size={16} /> },
  {
    label: "Webhooks",
    href: "/dashboard/webhooks",
    icon: <Webhook size={16} />,
  },
  {
    label: "Support",
    href: "/dashboard/support",
    icon: <LifeBuoy size={16} />,
  },
  {
    label: "Project Settings",
    href: "/dashboard/settings",
    icon: <Settings size={16} />,
  },
];

function SecurityReminderPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("mf_security_reminder_dismissed");
    if (dismissed) return;

    // Fetch user profile and passkeys to check security status
    async function checkSecurityStatus() {
      try {
        const token = localStorage.getItem("mf_access_token");
        if (!token) return;

        const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
        const meRes = await fetch(`${API}/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meData = await meRes.json();
        
        if (!meData.success) return;
        const user = meData.data;

        // Check if user is older than 1 day (or for demo, just show if missing both)
        // If they have TOTP enabled, they are fine
        if (user.totpEnabled) return;

        const pkRes = await fetch(`${API}/v1/auth/passkey`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const pkData = await pkRes.json();
        
        // If they have passkeys, they are fine
        if (Array.isArray(pkData) && pkData.length > 0) return;

        // Only show if user account was created > 24 hours ago
        if (user.createdAt) {
          const createdDate = new Date(user.createdAt);
          const now = new Date();
          const diffHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
          if (diffHours < 24) return; // wait 1-2 days
        }

        // Neither TOTP nor passkey is set up
        setShow(true);
      } catch {}
    }

    checkSecurityStatus();
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full relative animate-in zoom-in-95 duration-200">
        <button 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          onClick={() => {
            localStorage.setItem("mf_security_reminder_dismissed", "true");
            setShow(false);
          }}
        >
          <X size={18} />
        </button>
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <Shield size={24} className="text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Secure Your Account</h3>
        <p className="text-sm text-gray-600 mb-6">
          You haven't set up Two-Factor Authentication (2FA) or Passkeys yet. Add an extra layer of security to protect your sender reputation and account settings.
        </p>
        <div className="flex gap-3">
          <button 
            className="flex-1 btn-ghost text-sm py-2"
            onClick={() => {
              localStorage.setItem("mf_security_reminder_dismissed", "true");
              setShow(false);
            }}
          >
            Later
          </button>
          <Link 
            href="/dashboard/settings"
            onClick={() => {
              localStorage.setItem("mf_security_reminder_dismissed", "true");
              setShow(false);
            }}
            className="flex-1 btn-primary text-sm py-2 text-center"
          >
            Setup Now
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isCollapsed = !isHovered;

  const [user, setUser] = useState<{name: string, email?: string, plan?: string, onboardingCompleted?: boolean}>({ name: "User", email: "dev@qwikmailer.in", plan: "free" });
  const [userInitial, setUserInitial] = useState("U");
  
  const [teams, setTeams] = useState<any[]>([]);
  const [activeTeamId, setActiveTeamId] = useState("");
  const { role, isViewer, canAdmin } = useRole();

  // Sandbox state
  const [sandboxMode, setSandboxMode] = useState(false);
  const [sandboxToggling, setSandboxToggling] = useState(false);
  const [sandboxUnread, setSandboxUnread] = useState(0);
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const fetchSandboxSettings = useCallback(async (teamId: string) => {
    try {
      const token = localStorage.getItem("mf_access_token") ?? "";
      const res = await fetch(`${API}/v1/sandbox/settings`, {
        headers: { Authorization: `Bearer ${token}`, "X-Team-ID": teamId },
      });
      const json = await res.json();
      if (json.success) {
        setSandboxMode(json.data.sandboxMode);
        setSandboxUnread(json.data.unreadCount);
      }
    } catch {}
  }, [API]);

  async function toggleSandbox() {
    setSandboxToggling(true);
    try {
      const token = localStorage.getItem("mf_access_token") ?? "";
      const teamId = localStorage.getItem("mf_active_team") ?? "";
      const newVal = !sandboxMode;
      const res = await fetch(`${API}/v1/sandbox/settings`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "X-Team-ID": teamId, "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxMode: newVal }),
      });
      const json = await res.json();
      if (json.success) setSandboxMode(json.data.sandboxMode);
    } catch {}
    setSandboxToggling(false);
  }

  useEffect(() => {
    const userStr = localStorage.getItem("mf_user");
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
        if (parsed.name) setUserInitial(parsed.name[0].toUpperCase());
        if (parsed.onboardingCompleted === false) {
          router.push("/onboarding");
        }
      } catch (e) {}
    } else {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const token = localStorage.getItem("mf_access_token");
        if (!token) return;
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${API}/v1/teams`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          const allTeams = [
            ...(data.data.owned || []).map((t: any) => ({ ...t, role: 'owner' })),
            ...(data.data.member || []).filter((m: any) => !(data.data.owned || []).some((o: any) => o.id === m.id))
          ];
          setTeams(allTeams);
          const savedTeam = localStorage.getItem("mf_active_team");
          if (savedTeam && allTeams.some((t: any) => t.id === savedTeam)) {
            setActiveTeamId(savedTeam);
            const team = allTeams.find((t: any) => t.id === savedTeam);
            localStorage.setItem("mf_active_team_role", team.role);
          } else if (allTeams.length > 0) {
            setActiveTeamId(allTeams[0].id);
            localStorage.setItem("mf_active_team", allTeams[0].id);
            localStorage.setItem("mf_active_team_role", allTeams[0].role);
          } else {
            setActiveTeamId("");
            localStorage.removeItem("mf_active_team");
            localStorage.removeItem("mf_active_team_role");
            router.push("/projects");
          }
        }
      } catch (e) {}
    };
    fetchTeams();
  }, [router]);

  useEffect(() => {
    if (activeTeamId) fetchSandboxSettings(activeTeamId);
  }, [activeTeamId, fetchSandboxSettings]);

  function handleTeamChange(id: string) {
    setActiveTeamId(id);
    localStorage.setItem("mf_active_team", id);
    const selectedTeam = teams.find(t => t.id === id);
    if (selectedTeam) {
      localStorage.setItem("mf_active_team_role", selectedTeam.role);
    }
    window.location.reload(); // Reload to refetch resources for the new team
  }

  function handleLogout() {
    localStorage.removeItem("mf_access_token");
    localStorage.removeItem("mf_refresh_token");
    localStorage.removeItem("mf_user");
    localStorage.removeItem("mf_active_team");
    router.push("/login");
  }

  return (
    <div className="flex flex-col h-screen bg-[#fafafa] font-sans text-gray-900 overflow-hidden">
      {/* Top Full-Width Header */}
      <header className="h-16 shrink-0 flex items-center justify-between px-4 lg:px-6 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-gray-600 hover:bg-gray-100 p-2 rounded-md transition-colors"
          >
            <Menu size={20} />
          </button>

          <Link href="/projects" className="flex items-center gap-2.5 font-bold">
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-black shadow-sm">
              <Mail size={16} className="text-white" />
            </div>
            <span className="text-black tracking-tight font-bold hidden sm:block">Qwik Mailer</span>
            {activeTeamId && teams.length > 0 && (
              <span className="text-gray-400 font-normal hidden sm:block ml-1">/ {teams.find(t => t.id === activeTeamId)?.name}</span>
            )}
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {/* Plan badge in navbar */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200">
            <Zap size={11} className="text-gray-500" />
            <span className="text-xs font-semibold text-gray-600 capitalize">{user.plan} Plan</span>
          </div>
          <button className="p-2 relative rounded-full hover:bg-gray-100 transition-colors text-gray-600">
            <Bell size={18} />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-red-500" />
          </button>
          <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-800 to-black text-white flex items-center justify-center text-sm font-bold shadow-sm">
              {userInitial}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {user.name}
            </span>
          </div>
        </div>
      </header>

      {/* Main Body below header */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:static flex flex-col mt-16 lg:mt-0 overflow-x-hidden shrink-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } ${isCollapsed ? "w-16" : "w-64"}`}
        >
          {/* Mobile header (hidden on desktop since main header spans full width) */}
          <div className="h-16 flex items-center px-4 border-b border-gray-100 shrink-0 lg:hidden">
            <Link href="/projects" className="flex items-center gap-2.5 font-bold">
              <div className="w-8 h-8 rounded-md flex items-center justify-center bg-black shadow-sm">
                <Mail size={16} className="text-white" />
              </div>
              <span className="text-black tracking-tight font-bold whitespace-nowrap">Qwik Mailer</span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="ml-auto text-gray-500 hover:bg-gray-100 p-1.5 rounded-md"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col h-full overflow-hidden">
            {/* Team Switcher only (plan removed from sidebar) */}
            <div className={`shrink-0 transition-opacity duration-300 ${isCollapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100 h-auto"}`}>
              <div className="px-4 py-3">
                <div className="flex flex-col gap-1 whitespace-nowrap">
                  <Select 
                    value={activeTeamId} 
                    onChange={handleTeamChange}
                    options={teams.length === 0 ? [] : teams.map(t => ({ label: t.name, value: t.id }))}
                    placeholder={teams.length === 0 ? "Loading..." : "Select Project"}
                  />
                </div>
              </div>
            </div>

            {/* Nav */}
            <div className="p-0 py-2 flex-1 overflow-y-auto overflow-x-hidden">
              <nav className="space-y-1.5">
                {navItems
                  .filter(item => {
                    if (isViewer) {
                      return !["API Keys", "Webhooks", "Project Settings"].includes(item.label);
                    }
                    if (!canAdmin) {
                      return item.label !== "Project Settings";
                    }
                    return true;
                  })
                  .map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center px-3 py-2 mx-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap overflow-hidden ${
                        isActive
                          ? "bg-gray-100 text-gray-900 shadow-sm"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <div className="w-6 shrink-0 flex justify-center mr-3">
                        <span className={isActive ? "text-gray-900" : "text-gray-400"}>
                          {item.icon}
                        </span>
                      </div>
                      <span
                        className={`transition-opacity duration-300 ${
                          isCollapsed ? "opacity-0" : "opacity-100"
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.badge && !isActive && !isCollapsed && (
                        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Sandbox Toggle — above logout */}
            <div className="px-3 pb-2">
              <button
                onClick={toggleSandbox}
                disabled={sandboxToggling}
                title={sandboxMode ? "Sandbox ON — click to disable" : "Sandbox OFF — click to enable"}
                className={`w-full flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  sandboxMode
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <div className="w-6 shrink-0 flex justify-center">
                  <FlaskConical size={14} className={sandboxMode ? "text-amber-600" : "text-gray-400"} />
                </div>
                <div className={`flex items-center gap-2 flex-1 ml-2 transition-opacity duration-300 ${isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
                  <span>Sandbox {sandboxMode ? "ON" : "OFF"}</span>
                  {sandboxUnread > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-600 text-white">
                      {sandboxUnread}
                    </span>
                  )}
                </div>
                {!isCollapsed && (sandboxMode ? (
                  <ToggleRight size={16} className="text-amber-500 shrink-0 ml-auto" />
                ) : (
                  <ToggleLeft size={16} className="text-gray-400 shrink-0 ml-auto" />
                ))}
              </button>
            </div>

            <div className="py-3 border-t border-gray-100 overflow-x-hidden shrink-0">
              <button
                onClick={handleLogout}
                className="flex w-full items-center px-3 py-2 mx-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors whitespace-nowrap overflow-hidden"
              >
                <div className="w-6 shrink-0 flex justify-center mr-3">
                  <LogOut size={16} />
                </div>
                <span
                  className={`transition-opacity duration-300 ${
                    isCollapsed ? "opacity-0" : "opacity-100"
                  }`}
                >
                  Log out
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 relative bg-[#fafafa] flex flex-col">
          {children}
          <SecurityReminderPopup />
        </main>
      </div>
    </div>
  );
}

