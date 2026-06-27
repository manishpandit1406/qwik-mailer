"use client";

import { useState, useEffect } from "react";
import { Users, Mail, Ban, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEmails: 0,
    suppressedAddresses: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("mf_access_token");
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API}/v1/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const dummyChartData = [
    { name: 'Jan', emails: 4000, users: 240 },
    { name: 'Feb', emails: 3000, users: 139 },
    { name: 'Mar', emails: 2000, users: 980 },
    { name: 'Apr', emails: 2780, users: 390 },
    { name: 'May', emails: 1890, users: 480 },
    { name: 'Jun', emails: 2390, users: 380 },
    { name: 'Jul', emails: 3490, users: 430 },
  ];

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Platform Overview</h1>
          <p className="text-gray-500 text-sm mt-1">High-level metrics and health of the platform.</p>
        </div>
        <button onClick={fetchStats} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={64} className="text-gray-900" />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Users size={16} className="text-gray-900" />
            </div>
            <h3 className="font-semibold text-gray-700">Total Users</h3>
          </div>
          <div className="text-4xl font-black tracking-tight text-gray-900 mb-2">
            {loading ? "..." : stats.totalUsers.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
            <ArrowUpRight size={16} />
            <span>+12% this month</span>
          </div>
        </div>

        <div className="glass-card p-6 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Mail size={64} className="text-gray-900" />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Mail size={16} className="text-gray-900" />
            </div>
            <h3 className="font-semibold text-gray-700">Emails Processed</h3>
          </div>
          <div className="text-4xl font-black tracking-tight text-gray-900 mb-2">
            {loading ? "..." : stats.totalEmails.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
            <ArrowUpRight size={16} />
            <span>+24% this month</span>
          </div>
        </div>

        <div className="glass-card p-6 bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Ban size={64} className="text-red-600" />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Ban size={16} className="text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-700">Global Suppressions</h3>
          </div>
          <div className="text-4xl font-black tracking-tight text-gray-900 mb-2">
            {loading ? "..." : stats.suppressedAddresses.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-sm text-rose-600 font-medium">
            <ArrowDownRight size={16} />
            <span>-2% this month</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-6 bg-white mt-8">
        <h3 className="font-bold text-gray-900 mb-6">Platform Activity (30 Days)</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dummyChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dx={-10} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dx={10} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px' }}
                cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }}
              />
              <Line yAxisId="left" type="monotone" dataKey="emails" stroke="#111827" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#111827', stroke: '#fff', strokeWidth: 2 }} />
              <Line yAxisId="right" type="monotone" dataKey="users" stroke="#9ca3af" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
