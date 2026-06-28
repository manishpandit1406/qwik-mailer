"use client";
import { useState, useEffect } from "react";
import { LifeBuoy, Search, Mail, Clock, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface Ticket {
  id: string;
  userId: string;
  teamId: string | null;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const fetchTickets = async (p = page) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("mf_access_token");
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API}/v1/admin/tickets?page=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTickets(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(page);
  }, [page]);

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(search.toLowerCase()) || 
    t.userId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Support Desk</h1>
          <p className="text-sm text-gray-500 mt-1">Manage user support tickets and inquiries.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search subjects or User ID..."
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
                <th className="px-6 py-4 font-semibold">Subject</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">User ID</th>
                <th className="px-6 py-4 font-semibold">Project ID</th>
                <th className="px-6 py-4 font-semibold">Created At</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center mb-2">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                    </div>
                    Loading tickets...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <LifeBuoy size={24} className="mx-auto mb-2 text-gray-300" />
                    No support tickets found
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 truncate max-w-[250px]">{t.subject}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[250px] mt-0.5">{t.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {t.status === 'resolved' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"><CheckCircle size={12}/> Resolved</span>}
                      {t.status === 'open' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><Clock size={12}/> Open</span>}
                      {t.status === 'in_progress' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"><Clock size={12}/> In Progress</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-500 font-mono text-xs">{t.userId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-500 font-mono text-xs">{t.teamId || "N/A"}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {format(new Date(t.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="text-sm font-medium text-black hover:underline inline-flex items-center gap-1">
                        <Mail size={14} /> Reply
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
            Showing <span className="font-medium text-gray-900">{filteredTickets.length}</span> results
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
              disabled={tickets.length < 20 || loading}
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
