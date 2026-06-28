"use client";
import { useState, useEffect } from "react";
import { Ban, Search, Trash2, ShieldAlert, ChevronLeft, ChevronRight, UserX } from "lucide-react";
import { format } from "date-fns";

interface Suppression {
  id: string;
  email: string;
  reason: string | null;
  createdAt: string;
  teamId: string | null;
}

export default function AdminSuppressionPage() {
  const [suppressions, setSuppressions] = useState<Suppression[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSuppressions = async (p = page) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("mf_access_token");
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API}/v1/admin/suppression?page=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuppressions(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppressions(page);
  }, [page]);

  const handleRemove = async (id: string, email: string) => {
    if (!window.confirm(`Are you sure you want to remove ${email} from the suppression list? They will start receiving emails again.`)) return;
    
    try {
      setActionLoading(id);
      const token = localStorage.getItem("mf_access_token");
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API}/v1/admin/suppression/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuppressions(prev => prev.filter(s => s.id !== id));
      } else {
        alert(data.error || "Failed to remove");
      }
    } catch (e) {
      alert("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSuppressions = suppressions.filter(s => 
    s.email.toLowerCase().includes(search.toLowerCase()) || 
    (s.teamId && s.teamId.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Suppression List</h1>
          <p className="text-sm text-gray-500 mt-1">Manage hard bounces, complaints, and globally blocked addresses.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search email address..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-shadow bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Blocked Email</th>
                <th className="px-6 py-4 font-semibold">Reason</th>
                <th className="px-6 py-4 font-semibold">Team ID</th>
                <th className="px-6 py-4 font-semibold">Added On</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center mb-2">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                    </div>
                    Loading suppression list...
                  </td>
                </tr>
              ) : filteredSuppressions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Ban size={24} className="mx-auto mb-2 text-gray-300" />
                    No blocked addresses found
                  </td>
                </tr>
              ) : (
                filteredSuppressions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <UserX size={16} className="text-red-500" />
                        <span className="font-medium text-gray-900">{s.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        <ShieldAlert size={12}/> {s.reason || "Hard Bounce"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-500 font-mono text-xs">{s.teamId || "Global"}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {format(new Date(s.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleRemove(s.id, s.email)}
                        disabled={actionLoading === s.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        title="Remove from suppression list"
                      >
                        {actionLoading === s.id ? (
                           <div className="w-4 h-4 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">{filteredSuppressions.length}</span> results
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1 || loading}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white text-gray-600 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setPage(page + 1)}
              disabled={suppressions.length < 20 || loading}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white text-gray-600 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
