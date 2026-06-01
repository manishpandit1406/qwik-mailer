"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  LifeBuoy,
} from "lucide-react";
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
  {
    label: "Bulk Upload",
    href: "/dashboard/bulk-upload",
    icon: <FileSpreadsheet size={16} />,
  },
  { label: "Email Logs", href: "/dashboard/logs", icon: <Mail size={16} /> },
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
  { label: "Domains", href: "/dashboard/domains", icon: <Globe size={16} /> },
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
    label: "Team",
    href: "/dashboard/team",
    icon: <Users size={16} />,
    badge: "New",
  },
  {
    label: "Suppression List",
    href: "/dashboard/suppression",
    icon: <Ban size={16} />,
  },
  { label: "API Keys", href: "/dashboard/api-keys", icon: <Key size={16} /> },
  { label: "API Docs", href: "/docs", icon: <BookOpen size={16} /> },
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
    label: "Settings",
    href: "/dashboard/settings",
    icon: <Settings size={16} />,
  },
];
function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState({
    name: "Developer",
    email: "dev@qwikmailer.in",
    plan: "free",
  });
  useEffect(() => {
    const userStr = localStorage.getItem("mf_user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {}
    }
  }, []);
  function handleLogout() {
    localStorage.removeItem("mf_access_token");
    localStorage.removeItem("mf_refresh_token");
    localStorage.removeItem("mf_user");
    router.push("/login");
  }
  return (
    <div className="flex flex-col h-full">
      {" "}
      {/* Plan badge */}{" "}
      <div className="px-4 py-3">
        {" "}
        <div className="flex items-center justify-between px-3 py-2 rounded-md bg-gray-50 border border-gray-200">
          {" "}
          <div className="flex items-center gap-2 text-gray-700">
            {" "}
            <Zap size={13} />{" "}
            <span className="text-xs font-semibold capitalize">
              {" "}
              {user.plan} Plan{" "}
            </span>{" "}
          </div>{" "}
          <Link
            href="/dashboard/settings"
            className="text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            {" "}
            Upgrade{" "}
          </Link>{" "}
        </div>{" "}
      </div>{" "}
      {/* Nav */}{" "}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto space-y-0.5">
        {" "}
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href as any}
              onClick={onClose}
              className={`nav-item ${active ? "active" : ""}`}
            >
              {" "}
              {item.icon} {item.label}{" "}
              {item.badge && !active && (
                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">
                  {" "}
                  {item.badge}{" "}
                </span>
              )}{" "}
            </Link>
          );
        })}{" "}
      </nav>{" "}
      {/* User */}{" "}
      <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
        {" "}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors">
          {" "}
          <div className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold bg-gray-800 text-white">
            {" "}
            {user.name?.[0]?.toUpperCase() ?? "D"}{" "}
          </div>{" "}
          <div className="flex-1 min-w-0">
            {" "}
            <p className="text-sm font-medium truncate text-gray-900">
              {" "}
              {user.name}{" "}
            </p>{" "}
            <p className="text-xs truncate text-gray-500">
              {" "}
              {user.email}{" "}
            </p>{" "}
          </div>{" "}
          <button
            onClick={handleLogout}
            className="btn-ghost p-1.5 shrink-0"
            title="Logout"
          >
            {" "}
            <LogOut
              size={14}
              className="text-gray-400 hover:text-gray-600"
            />{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{name: string, onboardingCompleted?: boolean}>({ name: "User" });
  const router = useRouter();
  
  useEffect(() => {
    const userStr = localStorage.getItem("mf_user");
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
        if (parsed.onboardingCompleted === false) {
          router.push("/onboarding");
        }
      } catch (e) {}
    } else {
      router.push("/login");
    }
  }, [router]);

  const pathname = usePathname();
  const pageTitle =
    navItems.find(
      (n) =>
        n.href === pathname ||
        (n.href !== "/dashboard" && pathname.startsWith(n.href)),
    )?.label ?? "Dashboard";
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-primary">
      {/* Global Top Navbar */}
      <header 
        className="h-16 shrink-0 flex items-center justify-between px-6 z-40 bg-white/80 backdrop-blur-md border-b"
        style={{ borderColor: "var(--border-subtle, #eaeaea)" }}
      >
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden btn-ghost p-1.5 text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg">
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-black shadow-sm">
              <Mail size={16} className="text-white" />
            </div>
            <span className="text-black tracking-tight hidden sm:block">
              Qwik Mailer
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost p-2 relative rounded-full hover:bg-gray-100 transition-colors">
            <Bell size={18} className="text-gray-700" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-black" />
          </button>
          <Link href="/dashboard/settings" className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold uppercase transition-transform hover:scale-105 shadow-sm">
            {user.name?.[0] || 'U'}
          </Link>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-60 border-r shrink-0 border-theme bg-secondary overflow-y-auto">
          <Sidebar />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-gray-900/40" onClick={() => setSidebarOpen(false)} />
            <aside className="relative flex flex-col w-72 border-r border-theme bg-secondary overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-theme shrink-0">
                <span className="font-bold">Menu</span>
                <button onClick={() => setSidebarOpen(false)} className="btn-ghost p-1"><X size={18} /></button>
              </div>
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
