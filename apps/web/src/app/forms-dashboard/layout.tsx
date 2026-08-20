"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ClipboardList,
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Zap,
  ArrowLeft
} from "lucide-react";
import { Select } from "@/components/Select";
import { SandboxProvider } from "@/lib/sandboxContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: "My Forms",
    href: "/forms-dashboard",
    icon: <LayoutDashboard size={16} />,
  },
  {
    label: "Templates",
    href: "/forms-dashboard/templates",
    icon: <FileText size={16} />,
  },
  {
    label: "Global Settings",
    href: "/forms-dashboard/settings",
    icon: <Settings size={16} />,
  }
];

export default function FormsDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isCollapsed = !isHovered;

  const [user, setUser] = useState<{name: string, email?: string, plan?: string}>({ name: "User", plan: "free" });
  const [userInitial, setUserInitial] = useState("U");
  
  const [teams, setTeams] = useState<any[]>([]);
  const [activeTeamId, setActiveTeamId] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem("mf_user");
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
        if (parsed.name) setUserInitial(parsed.name[0].toUpperCase());
      } catch (e) {}
    } else {
      window.location.href = "/login";
    }

    const fetchMe = async () => {
      try {
        const token = localStorage.getItem("mf_access_token");
        if (!token) return;
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${API}/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success && json.data) {
          const freshUser = json.data;
          setUser(prev => ({ ...prev, plan: freshUser.plan, name: freshUser.name || prev.name }));
          if (freshUser.name) setUserInitial(freshUser.name[0].toUpperCase());
        }
      } catch (e) {}
    };
    fetchMe();
  }, []);

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
          } else if (allTeams.length > 0) {
            setActiveTeamId(allTeams[0].id);
            localStorage.setItem("mf_active_team", allTeams[0].id);
          }
        }
      } catch (e) {}
    };
    fetchTeams();
  }, []);

  function handleTeamChange(id: string) {
    setActiveTeamId(id);
    localStorage.setItem("mf_active_team", id);
    window.location.reload(); 
  }

  function handleLogout() {
    localStorage.removeItem("mf_access_token");
    localStorage.removeItem("mf_refresh_token");
    localStorage.removeItem("mf_user");
    localStorage.removeItem("mf_active_team");
    window.location.href = "/login";
  }

  return (
    <SandboxProvider>
    <div className="flex flex-col h-screen bg-[#fafafa] font-sans text-gray-900 overflow-hidden">
      {/* Top Header */}
      <header className="h-16 shrink-0 flex items-center justify-between px-4 lg:px-6 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-gray-600 hover:bg-gray-100 p-2 rounded-md transition-colors"
          >
            <Menu size={20} />
          </button>

          <Link href="/forms-dashboard" className="flex items-center gap-2.5 font-bold">
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-black shadow-sm">
              <ClipboardList size={16} className="text-white" />
            </div>
            <span className="text-black tracking-tight font-extrabold hidden sm:block">QwikForms</span>
            <span className="hidden sm:inline-flex items-center text-[9px] font-bold uppercase tracking-widest text-gray-500 border border-gray-200 rounded-md px-1.5 py-0.5 bg-gray-50">
              by QwikMailer
            </span>
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <a href="https://qwikmailer.in/dashboard" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer text-gray-600 font-medium text-xs">
            <ArrowLeft size={12} /> Back to CRM
          </a>
          <button className="p-2 relative rounded-full hover:bg-gray-100 transition-colors text-gray-600">
            <Bell size={18} />
          </button>
          <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-800 to-black text-white flex items-center justify-center text-sm font-bold shadow-sm">
              {userInitial}
            </div>
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
          <div className="flex flex-col h-full overflow-hidden">
            {/* Team Switcher */}
            <div className={`shrink-0 transition-opacity duration-300 ${isCollapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100 h-auto"}`}>
              <div className="px-4 py-4 border-b border-gray-100">
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
            <div className="p-0 py-4 flex-1 overflow-y-auto overflow-x-hidden">
              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group whitespace-nowrap ${
                        isActive
                          ? "bg-black text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <div className={`shrink-0 ${isActive ? "text-white" : "text-gray-500 group-hover:text-gray-900"}`}>
                        {item.icon}
                      </div>
                      <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 hidden" : "opacity-100"}`}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Logout */}
            <div className="p-3 border-t border-gray-100 shrink-0">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors group whitespace-nowrap"
              >
                <div className="shrink-0 group-hover:text-red-600 text-gray-400">
                  <LogOut size={16} />
                </div>
                <span className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 hidden" : "opacity-100"}`}>
                  Log out
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 relative z-0">
          {children}
        </main>
      </div>
    </div>
    </SandboxProvider>
  );
}
