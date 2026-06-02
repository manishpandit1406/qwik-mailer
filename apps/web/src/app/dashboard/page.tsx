"use client";
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
}
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  trend?: { value: string; up: boolean };
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
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold ${trend.up ? "text-emerald-600" : "text-red-600"}`}
          >
            {" "}
            {trend.up ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}{" "}
            {trend.value}{" "}
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
  const [loading, setLoading] = useState(true);
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
            const dateStr = new Date(d.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            dataMap.set(dateStr, d);
          });
          const formatted = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
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
      {/* Stat cards */}{" "}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {" "}
        <StatCard
          label="Total Sent"
          value={stats!.sent.toLocaleString()}
          sub="This month"
          icon={<Mail size={18} />}
          color="#6366f1"
          trend={{ value: "+12%", up: true }}
        />{" "}
        <StatCard
          label="Delivery Rate"
          value={`${stats!.deliveryRate}%`}
          sub={`${stats!.delivered.toLocaleString()} delivered`}
          icon={<CheckCircle2 size={18} />}
          color="#10b981"
          trend={{ value: "+1.1%", up: true }}
        />{" "}
        <StatCard
          label="Open Rate"
          value={`${stats!.openRate}%`}
          sub={`${stats!.opened.toLocaleString()} opens`}
          icon={<BarChart3 size={18} />}
          color="#8b5cf6"
          trend={{ value: "+3.4%", up: true }}
        />{" "}
        <StatCard
          label="Bounce Rate"
          value={`${stats!.bounceRate}%`}
          sub={`${stats!.bounced} bounced`}
          icon={<AlertCircle size={18} />}
          color="#f59e0b"
          trend={{ value: "-0.3%", up: false }}
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
                  label: "Add Domain",
                  href: "/dashboard/domains",
                  icon: <Globe size={15} />,
                },
                {
                  label: "Create Key",
                  href: "/dashboard/api-keys",
                  icon: <Zap size={15} />,
                },
                {
                  label: "New Template",
                  href: "/dashboard/templates",
                  icon: <BarChart3 size={15} />,
                },
                {
                  label: "Analytics",
                  href: "/dashboard/analytics",
                  icon: <BarChart3 size={15} />,
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
                      {new Date(email.createdAt).toLocaleDateString()}{" "}
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
