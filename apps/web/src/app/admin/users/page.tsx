"use client";

import { useState, useEffect } from "react";
import { Users, Search, MoreVertical, Ban, CheckCircle, ShieldAlert, ChevronLeft, ChevronRight, X } from "lucide-react";
import { format } from "date-fns";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface User {
  id: string;
  name: string | null;
  email: string;
  plan: string;
  role: string;
  emailVerified: boolean;
  isSuspended: boolean;
  suspendReason: string | null;
  reputationScore: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  
  // Modal State
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async (p = page) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("mf_access_token");
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API}/v1/admin/users?page=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSuspend = async () => {
    if (!selectedUser || !suspendReason) return;
    try {
      setActionLoading(true);
      const token = localStorage.getItem("mf_access_token");
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API}/v1/admin/users/${selectedUser.id}/suspend`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: suspendReason })
      });
      const data = await res.json();
      if (data.success) {
        setSuspendModalOpen(false);
        setSuspendReason("");
        fetchUsers();
      } else {
        alert(data.error || "Failed to suspend user");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspend = async (user: User) => {
    if (!confirm(`Are you sure you want to unsuspend ${user.email}?`)) return;
    try {
      setActionLoading(true);
      const token = localStorage.getItem("mf_access_token");
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API}/v1/admin/users/${user.id}/unsuspend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || "Failed to unsuspend user");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()) || (u.name && u.name.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage platform users, suspend bad actors, and monitor reputation.</p>
        </div>
      </div>

      <div className="glass-card bg-white flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 bg-gray-50/50 uppercase">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Plan</th>
                <th className="px-6 py-4 font-semibold">Reputation</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={32} className="text-gray-300" />
                      <p>No users found matching your search.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 flex items-center justify-center text-gray-700 font-bold text-xs shrink-0">
                          {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                            {user.name || "Unknown User"}
                            {user.role === 'admin' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-900 text-white">ADMIN</span>
                            )}
                          </div>
                          <div className="text-gray-500 text-xs truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize font-medium text-gray-700">{user.plan}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full max-w-[80px] bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${user.reputationScore > 80 ? 'bg-emerald-500' : user.reputationScore > 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                            style={{ width: `${Math.max(0, user.reputationScore)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{user.reputationScore}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.isSuspended ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 cursor-help" title={user.suspendReason || "Suspended"}>
                          <Ban size={12} />
                          Suspended
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle size={12} />
                          Active
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors outline-none">
                            <MoreVertical size={16} />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content align="end" className="w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-1 z-50 animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2">
                            {user.isSuspended ? (
                              <DropdownMenu.Item 
                                onClick={() => handleUnsuspend(user)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 font-medium rounded-lg hover:bg-emerald-50 outline-none cursor-pointer transition-colors"
                              >
                                <CheckCircle size={14} />
                                Unsuspend Account
                              </DropdownMenu.Item>
                            ) : (
                              <DropdownMenu.Item 
                                onClick={() => {
                                  setSelectedUser(user);
                                  setSuspendModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 font-medium rounded-lg hover:bg-red-50 outline-none cursor-pointer transition-colors"
                              >
                                <Ban size={14} />
                                Suspend Account
                              </DropdownMenu.Item>
                            )}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Showing Page {page}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={users.length < 20}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Suspend Modal */}
      {suspendModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full relative animate-in zoom-in-95 duration-200">
            <button 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => {
                setSuspendModalOpen(false);
                setSuspendReason("");
              }}
            >
              <X size={18} />
            </button>
            
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert size={24} className="text-red-600" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-1">Suspend User</h3>
            <p className="text-sm text-gray-500 mb-6">
              You are about to suspend <strong>{selectedUser.email}</strong>. They will immediately lose access to the platform and all their API keys and Webhooks will be blocked.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reason for suspension</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. High bounce rate, spam complaints..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none h-24"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  className="flex-1 btn-ghost"
                  onClick={() => {
                    setSuspendModalOpen(false);
                    setSuspendReason("");
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg px-4 py-2 transition-colors disabled:opacity-50 flex justify-center items-center"
                  onClick={handleSuspend}
                  disabled={!suspendReason || actionLoading}
                >
                  {actionLoading ? "Suspending..." : "Suspend User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
