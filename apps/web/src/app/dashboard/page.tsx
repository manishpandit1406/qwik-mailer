"use client";
import { formatIST } from "@/lib/dateUtils";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Mail,
  TrendingUp,
  TrendingDown,
  Send,
  AlertCircle,
  CheckCircle2,
  Zap,
  Globe,
  ArrowUpRight,
  Users,
  FileText,
  Webhook
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Link from "next/link";
interface Stats {
  sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  bounceRate: number;
  trends?: {
    sent: number;
    deliveryRate: number;
    openRate: number;
    bounceRate: number;
  };
}
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  trend,
  inverseTrend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  inverseTrend?: boolean;
}) {
  return (
    <div className="stat-card animate-fade-up">
      {" "}
      <div className="flex items-start justify-between mb-4">
        {" "}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-700">
          {" "}
          {icon}{" "}
        </div>{" "}
        {trend !== undefined && (
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold ${(inverseTrend ? trend <= 0 : trend >= 0) ? "text-emerald-600" : "text-red-600"
              }`}
          >
            {" "}
            {trend >= 0 ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}{" "}
            {trend > 0 ? "+" : ""}{trend}%{" "}
          </span>
        )}{" "}
      </div>{" "}
      <div className="metric-number mb-0.5">{value}</div>{" "}
      <div className="metric-label">{label}</div>{" "}
      {sub && (
        <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {sub}
        </div>
      )}{" "}
    </div>
  );
}
const statusStyles: Record<string, string> = {
  delivered: "badge-success",
  bounced: "badge-danger",
  queued: "badge-info",
  failed: "badge-danger",
  sending: "badge-warning",
};
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-4 py-3 text-sm">
      {" "}
      <p
        className="font-semibold mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </p>{" "}
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-2">
          {" "}
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.color }}
          />{" "}
          <span style={{ color: "var(--text-secondary)" }}>{p.name}:</span>{" "}
          <span
            className="font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {p.value}
          </span>{" "}
        </p>
      ))}{" "}
    </div>
  );
};
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [daily, setDaily] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Poll for active jobs every 5 seconds
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    async function fetchActiveJobs() {
      try {
        const token = localStorage.getItem("mf_access_token");
        if (!token) return;
        const res = await fetch(`${API}/v1/analytics/active-jobs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          setActiveJobs(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch active jobs:", err);
      }
    }

    fetchActiveJobs();
    intervalId = setInterval(fetchActiveJobs, 5000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const token = localStorage.getItem("mf_access_token");
        const headers = { Authorization: `Bearer ${token}` };
        const [statsRes, dailyRes, logsRes] = await Promise.all([
          fetch(`${API}/v1/analytics?period=30d`, { headers }),
          fetch(`${API}/v1/analytics/daily?days=7`, { headers }),
          fetch(`${API}/v1/logs?page=1&limit=5`, { headers }),
        ]);
        if (
          statsRes.status === 401 ||
          dailyRes.status === 401 ||
          logsRes.status === 401
        ) {
          localStorage.removeItem("mf_access_token");
          localStorage.removeItem("mf_user");
          window.location.href = "/login";
          return;
        }
        const statsData = await statsRes.json();
        const dailyData = await dailyRes.json();
        const logsData = await logsRes.json();
        if (statsData.success) setStats(statsData.data);
        if (dailyData.success) {
          const dataMap = new Map();
          dailyData.data.forEach((d: any) => {
            const dateStr = formatIST(d.date, false);
            dataMap.set(dateStr, d);
          });
          const formatted = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = formatIST(d, false);
            if (dataMap.has(dateStr)) {
              formatted.push({ ...dataMap.get(dateStr), date: dateStr });
            } else {
              formatted.push({
                date: dateStr,
                sent: 0,
                delivered: 0,
                failed: 0,
                bounced: 0,
                opened: 0,
                clicked: 0,
              });
            }
          }
          setDaily(formatted);
        }
        if (logsData.success) setRecent(logsData.data.items);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);
  if (loading || !stats) {
    return (
      <div className="space-y-6 ">
        {" "}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {" "}
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-lg" />
          ))}{" "}
        </div>{" "}
        <div className="skeleton h-72 rounded-lg" />{" "}
      </div>
    );
  }
  const maxVolume = daily.length
    ? Math.max(
      ...daily.map((d: any) =>
        Math.max(
          d.sent || 0,
          d.delivered || 0,
          d.failed || 0,
          d.bounced || 0,
        ),
      ),
    )
    : 0;
  const yMax = Math.max(5, Math.ceil(maxVolume * 1.2));
  return (
    <div className="space-y-6 ">
      {" "}
      {/* Welcome banner */}{" "}
      <div className="glass-card p-6 flex items-center justify-between overflow-hidden relative">
        {" "}
        <div className="relative">
          {" "}
          <h2
            className="text-xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Good afternoon 👋
          </h2>{" "}
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {" "}
            Your email delivery rate is{" "}
            <strong className="text-emerald-600">
              {stats?.deliveryRate}%
            </strong>{" "}
            this month. You're doing great!{" "}
          </p>{" "}
        </div>{" "}
        <Link
          href="/dashboard/send"
          className="btn-primary flex items-center gap-2 shrink-0 relative"
        >
          {" "}
          <Send size={14} /> Send Email{" "}
        </Link>{" "}
      </div>{" "}

      {/* Active Sending Jobs */}{" "}
      {activeJobs.length > 0 && (
        <div className="glass-card p-6 overflow-hidden relative animate-fade-up border-indigo-200" style={{ borderLeft: "4px solid #6366f1" }}>
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap size={18} className="text-indigo-500" /> Active Sending Queue
          </h3>
          <div className="space-y-5">
            {activeJobs.map((job: any) => {
              const total = Number(job.total || 0);
              const delivered = Number(job.delivered || 0);
              const failed = Number(job.failed || 0);
              const pending = Number(job.pending || 0);
              const processed = delivered + failed;
              const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
              
              return (
                <div key={job.batch_id || job.subject} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{job.subject || "Campaign"}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {pending > 0 ? "Sending in progress..." : "Finalizing..."}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-indigo-600">{percent}%</p>
                      <p className="text-xs text-gray-500">{processed} / {total} processed</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar Track */}
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                    {/* Delivered (Green) */}
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500" 
                      style={{ width: `${total > 0 ? (delivered / total) * 100 : 0}%` }}
                    />
                    {/* Failed (Red) */}
                    <div 
                      className="h-full bg-rose-500 transition-all duration-500" 
                      style={{ width: `${total > 0 ? (failed / total) * 100 : 0}%` }}
                    />
                    {/* Pending / Sending (Animated Striped Indigo) */}
                    {pending > 0 && (
                      <div 
                        className="h-full bg-indigo-500 opacity-60 relative overflow-hidden" 
                        style={{ 
                          width: `${total > 0 ? (pending / total) * 100 : 0}%`,
                          backgroundImage: "linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)",
                          backgroundSize: "1rem 1rem",
                          animation: "progress-stripes 1s linear infinite"
                        }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 font-medium px-1">
                    <span>{delivered} Delivered</span>
                    {failed > 0 && <span className="text-rose-500">{failed} Failed</span>}
                    <span>{pending} Queued/Sending</span>
                  </div>
                </div>
              );
            })}
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes progress-stripes {
              from { background-position: 1rem 0; }
              to { background-position: 0 0; }
            }
          `}} />
        </div>
      )}

      {/* Stat cards */}{" "}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {" "}
        <StatCard
          label="Total Sent"
          value={stats!.sent.toLocaleString()}
          sub="This month"
          icon={<Mail size={18} />}
          color="#6366f1"
          trend={stats!.trends?.sent ?? 0}
        />{" "}
        <StatCard
          label="Delivery Rate"
          value={`${stats!.deliveryRate}%`}
          sub={`${stats!.delivered.toLocaleString()} delivered`}
          icon={<CheckCircle2 size={18} />}
          color="#10b981"
          trend={stats!.trends?.deliveryRate ?? 0}
        />{" "}
        <StatCard
          label="Open Rate"
          value={`${stats!.openRate}%`}
          sub={`${stats!.opened.toLocaleString()} opens`}
          icon={<BarChart3 size={18} />}
          color="#8b5cf6"
          trend={stats!.trends?.openRate ?? 0}
        />{" "}
        <StatCard
          label="Bounce Rate"
          value={`${stats!.bounceRate}%`}
          sub={`${stats!.bounced} bounced`}
          icon={<AlertCircle size={18} />}
          color="#f59e0b"
          trend={stats!.trends?.bounceRate ?? 0}
          inverseTrend={true}
        />{" "}
      </div>{" "}
      {/* Chart + Recent */}{" "}
      <div className="grid lg:grid-cols-5 gap-5">
        {" "}
        {/* Area chart */}{" "}
        <div className="glass-card p-6 lg:col-span-3">
          {" "}
          <div className="flex items-center justify-between mb-6">
            {" "}
            <div>
              {" "}
              <h3
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Email Volume
              </h3>{" "}
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--text-muted)" }}
              >
                Last 7 days
              </p>{" "}
            </div>{" "}
            <Link
              href="/dashboard/analytics"
              className="btn-ghost flex items-center gap-1 text-xs text-indigo-600"
            >
              {" "}
              View Full <ArrowUpRight size={12} />{" "}
            </Link>{" "}
          </div>{" "}
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={daily}
              margin={{ top: 10, right: 0, bottom: 0, left: -20 }}
            >
              {" "}
              <defs>
                {" "}
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  {" "}
                  <stop
                    offset="5%"
                    stopColor="#6366f1"
                    stopOpacity={0.3}
                  />{" "}
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />{" "}
                </linearGradient>{" "}
                <linearGradient id="deliveredGrad" x1="0" y1="0" x2="0" y2="1">
                  {" "}
                  <stop
                    offset="5%"
                    stopColor="#10b981"
                    stopOpacity={0.25}
                  />{" "}
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />{" "}
                </linearGradient>{" "}
              </defs>{" "}
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />{" "}
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />{" "}
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                domain={[0, yMax]}
              />{" "}
              <Tooltip content={<CustomTooltip />} />{" "}
              <Area
                type="monotone"
                dataKey="sent"
                name="Sent"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#sentGrad)"
              />{" "}
              <Area
                type="monotone"
                dataKey="delivered"
                name="Delivered"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#deliveredGrad)"
              />{" "}
              <Area
                type="monotone"
                dataKey="failed"
                name="Failed"
                stroke="#ec4899"
                strokeWidth={1.5}
                fill="none"
                strokeDasharray="3 3"
              />{" "}
              <Area
                type="monotone"
                dataKey="bounced"
                name="Bounced"
                stroke="#ef4444"
                strokeWidth={1.5}
                fill="none"
                strokeDasharray="4 2"
              />{" "}
            </AreaChart>
          </ResponsiveContainer>{" "}
        </div>{" "}
        {/* Quick actions + recent */}{" "}
        <div className="lg:col-span-2 space-y-4">
          {" "}
          {/* Quick actions */}{" "}
          <div className="glass-card p-5">
            {" "}
            <h3
              className="font-semibold text-sm mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Quick Actions
            </h3>{" "}
            <div className="grid grid-cols-2 gap-2">
              {" "}
              {[
                {
                  label: "Create Identity",
                  href: "/dashboard/senders",
                  icon: <Mail size={15} />,
                },
                {
                  label: "Create Key",
                  href: "/dashboard/api-keys",
                  icon: <Zap size={15} />,
                },
                {
                  label: "Templates",
                  href: "/dashboard/templates",
                  icon: <FileText size={15} />,
                },
                {
                  label: "Analytics",
                  href: "/dashboard/analytics",
                  icon: <BarChart3 size={15} />,
                },
                {
                  label: "Webhooks",
                  href: "/dashboard/webhooks",
                  icon: <Webhook size={15} />,
                },
                {
                  label: "Team Members",
                  href: "/dashboard/team",
                  icon: <Users size={15} />,
                },
              ].map(({ label, href, icon }) => (
                <Link
                  key={label}
                  href={href as any}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                >
                  {" "}
                  {icon} {label}{" "}
                </Link>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          {/* Recent emails */}{" "}
          <div className="glass-card p-5">
            {" "}
            <div className="flex items-center justify-between mb-4">
              {" "}
              <h3
                className="font-semibold text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                Recent Emails
              </h3>{" "}
              <Link
                href="/dashboard/logs"
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View all
              </Link>{" "}
            </div>{" "}
            <div className="space-y-3">
              {" "}
              {recent.length === 0 && (
                <div className="text-xs text-center p-4 text-slate-500">
                  No emails sent yet.
                </div>
              )}{" "}
              {recent.map((email: any) => (
                <div key={email.id} className="flex items-start gap-2">
                  {" "}
                  <div className="flex-1 min-w-0">
                    {" "}
                    <p
                      className="text-xs font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {email.toEmail}
                    </p>{" "}
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {email.subject}
                    </p>{" "}
                  </div>{" "}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {" "}
                    <span
                      className={statusStyles[email.status] ?? "badge-muted"}
                    >
                      {email.status}
                    </span>{" "}
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {" "}
                      {formatIST(email.createdAt, false)}{" "}
                    </span>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
