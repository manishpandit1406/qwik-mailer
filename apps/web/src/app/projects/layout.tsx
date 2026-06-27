"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutGrid,
  Globe,
  Settings,
  Menu,
  X,
  Mail,
  Bell,
  LogOut,
  CreditCard
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: "Projects",
    href: "/projects",
    icon: <LayoutGrid size={16} />,
  },
  {
    label: "Global Domains",
    href: "/projects/domains",
    icon: <Globe size={16} />,
  },
  {
    label: "Account Settings",
    href: "/projects/settings",
    icon: <Settings size={16} />,
  },
  {
    label: "Billing & Plans",
    href: "/projects/billing",
    icon: <CreditCard size={16} />,
  }
];

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState("User");
  const [userInitial, setUserInitial] = useState("U");

  const isCollapsed = !isHovered;

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("mf_user") || "{}");
      if (u.name) {
        setUserName(u.name);
        setUserInitial(u.name[0].toUpperCase());
      }
    } catch {}
  }, []);

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

          <Link href="/" className="flex items-center gap-2.5 font-bold">
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-black shadow-sm">
              <Mail size={16} className="text-white" />
            </div>
            <span className="text-black tracking-tight font-bold hidden sm:block">Qwik Mailer</span>
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <button className="p-2 relative rounded-full hover:bg-gray-100 transition-colors text-gray-600">
            <Bell size={18} />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-red-500" />
          </button>
          <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-800 to-black text-white flex items-center justify-center text-sm font-bold shadow-sm">
              {userInitial}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {userName}
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
            <Link href="/" className="flex items-center gap-2.5 font-bold">
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

          <div className="p-0 py-3 flex-1 overflow-y-auto mt-2 overflow-x-hidden">
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
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
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="py-3 border-t border-gray-100 overflow-x-hidden">
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
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 relative bg-[#fafafa]">
          {children}
        </main>
      </div>
    </div>
  );
}
