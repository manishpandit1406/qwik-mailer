"use client";
import { formatIST } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Clock, Globe, Monitor } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-4 py-3 text-xs">
      {" "}
      <p
        className="font-semibold mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </p>{" "}
      {payload.map((p: any) => (
        <p key={p.name} className="flex gap-2 items-center">
          {" "}
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.color || p.fill }}
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
const DEVICE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#64748b"];
const PLATFORM_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];
export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [summary, setSummary] = useState({
    deliveryRate: 0,
    failRate: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
  });
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [geoData, setGeoData] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<{
    deviceTypes: any[];
    platforms: any[];
  }>({ deviceTypes: [], platforms: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const token = localStorage.getItem("mf_access_token");
        if (!token) {
          window.location.href = "/login";
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        const periodDays = period === "7d" ? 7 : period === "30d" ? 30 : 90;
        const [statsRes, dailyRes, geoRes, deviceRes] = await Promise.all([
          fetch(`${API}/v1/analytics?period=${period}`, { headers }),
          fetch(`${API}/v1/analytics/daily?days=${periodDays}`, { headers }),
          fetch(`${API}/v1/analytics/geo?days=${periodDays}`, { headers }),
          fetch(`${API}/v1/analytics/devices?days=${periodDays}`, { headers }),
        ]);
        if (statsRes.status === 401) {
          window.location.href = "/login";
          return;
        }
        const [statsData, dailyDataJson, geoJson, deviceJson] =
          await Promise.all([
            statsRes.json(),
            dailyRes.json(),
            geoRes.json(),
            deviceRes.json(),
          ]);
        if (statsData.success) setSummary(statsData.data);
        if (dailyDataJson.success) {
          const dataMap = new Map();
          dailyDataJson.data.forEach((d: any) => {
            const dateStr = formatIST(d.date, false);
            dataMap.set(dateStr, d);
          });
          const formatted = [];
          for (let i = periodDays - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = formatIST(d, false);
            formatted.push(
              dataMap.has(dateStr)
                ? { ...dataMap.get(dateStr), date: dateStr }
                : {
                    date: dateStr,
                    sent: 0,
                    delivered: 0,
                    failed: 0,
                    bounced: 0,
                    opened: 0,
                    clicked: 0,
                  },
            );
          }
          setDailyData(formatted);
        }
        if (geoJson.success) setGeoData(geoJson.data);
        if (deviceJson.success) setDeviceData(deviceJson.data);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [period]);
  const maxVolume = dailyData.length
    ? Math.max(
        ...dailyData.map((d: any) =>
          Math.max(
            d.sent || 0,
            d.delivered || 0,
            d.failed || 0,
            d.bounced || 0,
            d.opened || 0,
            d.clicked || 0,
          ),
        ),
      )
    : 0;
  const yMax = Math.max(5, Math.ceil(maxVolume * 1.2));
  return (
    <div className="space-y-6 ">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2
            className="text-xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Analytics
          </h2>{" "}
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Deep insights into your email performance.
          </p>{" "}
        </div>{" "}
        <div
          className="flex rounded-xl overflow-hidden border"
          style={{ borderColor: "var(--border)" }}
        >
          {" "}
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-4 py-2 text-xs font-semibold transition-all"
              style={{
                background: period === p ? "var(--accent)" : "transparent",
                color: period === p ? "#fff" : "var(--text-secondary)",
              }}
            >
              {" "}
              {p}{" "}
            </button>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      <div
        className={`grid grid-cols-2 lg:grid-cols-5 gap-4 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}
      >
        {" "}
        {[
          {
            label: "Delivery Rate",
            value: `${summary.deliveryRate}%`,
            icon: <TrendingUp size={16} />,
          },
          {
            label: "Fail Rate",
            value: `${summary.failRate}%`,
            icon: <BarChart3 size={16} />,
          },
          {
            label: "Open Rate",
            value: `${summary.openRate}%`,
            icon: <BarChart3 size={16} />,
          },
          {
            label: "Click Rate",
            value: `${summary.clickRate}%`,
            icon: <Globe size={16} />,
          },
          {
            label: "Bounce Rate",
            value: `${summary.bounceRate}%`,
            icon: <Clock size={16} />,
          },
        ].map(({ label, value, icon }) => (
          <div key={label} className="stat-card animate-fade-up">
            {" "}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 bg-gray-50 border border-gray-200 text-gray-700">
              {icon}
            </div>{" "}
            <div className="metric-number">{value}</div>{" "}
            <div className="metric-label">{label}</div>{" "}
          </div>
        ))}{" "}
      </div>{" "}
      <div
        className={`glass-card p-6 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}
      >
        {" "}
        <h3
          className="font-semibold mb-5"
          style={{ color: "var(--text-primary)" }}
        >
          Email Volume & Delivery
        </h3>{" "}
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={dailyData}
            margin={{ top: 10, right: 0, bottom: 0, left: -20 }}
          >
            {" "}
            <defs>
              {" "}
              <linearGradient id="sentGrad2" x1="0" y1="0" x2="0" y2="1">
                {" "}
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />{" "}
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />{" "}
              </linearGradient>{" "}
              <linearGradient id="delGrad" x1="0" y1="0" x2="0" y2="1">
                {" "}
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />{" "}
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
            <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />{" "}
            <Area
              type="monotone"
              dataKey="sent"
              name="Sent"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#sentGrad2)"
            />{" "}
            <Area
              type="monotone"
              dataKey="delivered"
              name="Delivered"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#delGrad)"
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
      <div
        className={`grid lg:grid-cols-3 gap-5 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}
      >
        {" "}
        <div className="glass-card p-6 lg:col-span-2">
          {" "}
          <h3
            className="font-semibold mb-5"
            style={{ color: "var(--text-primary)" }}
          >
            Opens & Clicks
          </h3>{" "}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={dailyData.slice(-7)}
              margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
            >
              {" "}
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
              <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />{" "}
              <Bar
                dataKey="opened"
                name="Opens"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />{" "}
              <Bar
                dataKey="clicked"
                name="Clicks"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />{" "}
            </BarChart>
          </ResponsiveContainer>{" "}
        </div>{" "}
        <div className="glass-card p-6">
          {" "}
          <h3
            className="font-semibold mb-4 flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            {" "}
            <Monitor size={15} /> Device Types{" "}
          </h3>{" "}
          {deviceData.deviceTypes.length > 0 ? (
            <div className="flex flex-col items-center">
              {" "}
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  {" "}
                  <Pie
                    data={deviceData.deviceTypes}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    innerRadius={35}
                  >
                    {" "}
                    {deviceData.deviceTypes.map((_, i) => (
                      <Cell
                        key={i}
                        fill={DEVICE_COLORS[i % DEVICE_COLORS.length]}
                      />
                    ))}{" "}
                  </Pie>{" "}
                  <Tooltip />{" "}
                </PieChart>
              </ResponsiveContainer>{" "}
              <div className="space-y-1 w-full mt-2">
                {" "}
                {deviceData.deviceTypes.map((d, i) => (
                  <div
                    key={d.name}
                    className="flex items-center justify-between text-xs"
                  >
                    {" "}
                    <div className="flex items-center gap-1.5">
                      {" "}
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: DEVICE_COLORS[i % DEVICE_COLORS.length],
                        }}
                      />{" "}
                      <span style={{ color: "var(--text-secondary)" }}>
                        {d.name}
                      </span>{" "}
                    </div>{" "}
                    <span
                      className="font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {d.value}
                    </span>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-40">
              {" "}
              <Monitor size={28} className="text-gray-200 mb-2" />{" "}
              <p className="text-xs text-gray-400">No device data yet</p>{" "}
            </div>
          )}{" "}
        </div>{" "}
      </div>{" "}
      <div
        className={`glass-card p-6 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}
      >
        {" "}
        <h3
          className="font-semibold mb-5 flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          {" "}
          <Globe size={15} /> Top Recipient Countries{" "}
        </h3>{" "}
        {geoData.length > 0 ? (
          <div className="space-y-3">
            {" "}
            {geoData.map((item: any, i: number) => {
              const maxTotal = Math.max(
                ...geoData.map((d: any) => Number(d.total)),
              );
              const pct =
                maxTotal > 0 ? (Number(item.total) / maxTotal) * 100 : 0;
              return (
                <div
                  key={item.country ?? i}
                  className="flex items-center gap-3"
                >
                  {" "}
                  <span
                    className="w-20 text-xs font-semibold shrink-0"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.country ?? "Unknown"}
                  </span>{" "}
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    {" "}
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />{" "}
                  </div>{" "}
                  <div
                    className="flex gap-3 text-xs shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {" "}
                    <span>👁️ {Number(item.opens)}</span>{" "}
                    <span>🖱️ {Number(item.clicks)}</span>{" "}
                  </div>{" "}
                </div>
              );
            })}{" "}
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            {" "}
            <Globe size={32} className="text-slate-500 mb-3 opacity-50" />{" "}
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              No Geo Data Yet
            </p>{" "}
            <p className="text-xs text-slate-500 mt-1">
              Send more emails to start collecting location analytics.
            </p>{" "}
          </div>
        )}{" "}
      </div>{" "}
      {deviceData.platforms.length > 0 && (
        <div
          className={`glass-card p-6 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}
        >
          {" "}
          <h3
            className="font-semibold mb-5"
            style={{ color: "var(--text-primary)" }}
          >
            Platform Breakdown
          </h3>{" "}
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={deviceData.platforms}
              layout="vertical"
              margin={{ left: 10, right: 30 }}
            >
              {" "}
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />{" "}
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />{" "}
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                width={60}
              />{" "}
              <Tooltip content={<CustomTooltip />} />{" "}
              <Bar
                dataKey="value"
                name="Users"
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
              >
                {" "}
                {deviceData.platforms.map((_, i) => (
                  <Cell
                    key={i}
                    fill={PLATFORM_COLORS[i % PLATFORM_COLORS.length]}
                  />
                ))}{" "}
              </Bar>{" "}
            </BarChart>
          </ResponsiveContainer>{" "}
        </div>
      )}{" "}
    </div>
  );
}
