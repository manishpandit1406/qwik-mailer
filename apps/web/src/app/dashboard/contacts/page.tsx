"use client";
import { formatIST } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import { RefreshCw, BookUser, Mail, Phone, Trash2, Download, X, Eye, Search, ChevronLeft, ChevronRight, Tag, ListFilter, Upload, ShieldCheck, AlertTriangle, XCircle, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { useRole } from "@/lib/useRole";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
function getToken() {
  return typeof window !== "undefined" ? (localStorage.getItem("mf_access_token") ?? "") : "";
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewingContact, setViewingContact] = useState<any>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { isViewer } = useRole();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState("");

  const [newTagInput, setNewTagInput] = useState("");
  const [updatingTags, setUpdatingTags] = useState(false);

  useEffect(() => {

    fetch(`${API}/v1/contacts/tags`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(res => res.json())
      .then(json => { if (json.success) setAllTags(json.data); });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchContacts(page, debouncedSearch, selectedTag);
  }, [page, debouncedSearch, selectedTag]);

  async function fetchContacts(p = 1, s = "", t = "") {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/contacts?page=${p}&limit=20&search=${encodeURIComponent(s)}&tags=${encodeURIComponent(t)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setContacts(json.data);
        setTotalPages(json.meta.totalPages);
        setTotalCount(json.meta.total);
      } else {
        setError(json.error ?? "Failed to load contacts");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteContact(id: string) {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      const res = await fetch(`${API}/v1/contacts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setContacts(contacts.filter(c => c.id !== id));
      } else {
        alert(json.error ?? "Failed to delete");
      }
    } catch {
      alert("Network error");
    }
  }

  function downloadCSV() {
    if (totalCount === 0) return;
    fetch(`${API}/v1/contacts/export`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    })
    .catch(() => alert("Failed to download CSV"));
  }

  async function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch(`${API}/v1/contacts/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        // Refresh contacts and tags
        fetchContacts(1, debouncedSearch, selectedTag);
        fetch(`${API}/v1/contacts/tags`, { headers: { Authorization: `Bearer ${getToken()}` } })
          .then(res => res.json())
          .then(data => { if (data.success) setAllTags(data.data); });
      } else {
        alert(json.error ?? "Failed to import contacts");
      }
    } catch {
      alert("Network error during import");
    } finally {
      setLoading(false);
      e.target.value = ""; // Reset input
    }
  }

  async function addTagToContact(contactId: string) {
    if (!newTagInput.trim()) return;
    setUpdatingTags(true);
    try {
      const currentTags = viewingContact.tags || [];
      if (currentTags.includes(newTagInput.trim())) return;
      const updatedTags = [...currentTags, newTagInput.trim()];
      
      const res = await fetch(`${API}/v1/contacts/${contactId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tags: updatedTags })
      });
      const json = await res.json();
      if (json.success) {
        setViewingContact(json.data);
        setContacts(contacts.map(c => c.id === contactId ? json.data : c));
        if (!allTags.includes(newTagInput.trim())) {
          setAllTags([...allTags, newTagInput.trim()]);
        }
        setNewTagInput("");
      }
    } finally {
      setUpdatingTags(false);
    }
  }

  async function removeTagFromContact(contactId: string, tagToRemove: string) {
    setUpdatingTags(true);
    try {
      const updatedTags = (viewingContact.tags || []).filter((t: string) => t !== tagToRemove);
      const res = await fetch(`${API}/v1/contacts/${contactId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tags: updatedTags })
      });
      const json = await res.json();
      if (json.success) {
        setViewingContact(json.data);
        setContacts(contacts.map(c => c.id === contactId ? json.data : c));
      }
    } finally {
      setUpdatingTags(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Contacts</h1>
            <p className="text-gray-500 mt-1">Manage leads and subscribers collected from your forms and uploads.</p>
          </div>
          <div className="flex gap-3">
            {!isViewer && (
              <label className="btn-primary flex items-center gap-2 cursor-pointer">
                <Upload size={16} /> Import CSV
                <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="hidden" onChange={importCSV} />
              </label>
            )}
            <button className="btn-secondary flex items-center gap-2 bg-white" onClick={downloadCSV} disabled={contacts.length === 0}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex w-full sm:w-auto gap-3 flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <select 
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              value={selectedTag}
              onChange={e => setSelectedTag(e.target.value)}
            >
              <option value="">All Tags</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="text-sm text-gray-500 font-medium">
            Total {totalCount} contacts
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Contact Info</th>
                  <th className="px-6 py-4">Health</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Added</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-indigo-500" />
                      Loading contacts...
                    </td>
                  </tr>
                ) : contacts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                        <BookUser size={24} />
                      </div>
                      No contacts found.<br/> Contacts will appear here when users submit your forms.
                    </td>
                  </tr>
                ) : (
                  contacts.map(contact => (
                    <tr key={contact.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {contact.firstName || contact.lastName ? (
                            `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                          ) : (
                            <span className="text-gray-400 font-normal italic">Unknown</span>
                          )}
                        </div>
                        {contact.tags && contact.tags.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {contact.tags.map((tag: string) => (
                              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="flex items-center gap-2 text-gray-900">
                          <Mail size={14} className="text-gray-400" /> {contact.email}
                        </div>
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone size={14} className="text-gray-400" /> {contact.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const status = contact.validationStatus || "unknown";
                          const score = contact.validationScore;
                          if (status === "valid") return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"><ShieldCheck size={14} /> Valid {score ? `(${score})` : ''}</div>;
                          if (status === "invalid") return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200"><XCircle size={14} /> Invalid</div>;
                          if (status === "disposable") return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><ShieldAlert size={14} /> Disposable</div>;
                          if (status === "role_based") return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"><AlertTriangle size={14} /> Role-Based</div>;
                          return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">Unknown</div>;
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setViewingContact(contact)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          <Eye size={14} /> View Data
                        </button>
                      </td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {formatIST(contact.createdAt, true)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isViewer && (
                          <button 
                            onClick={() => deleteContact(contact.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="text-sm text-gray-500">
                Page <span className="font-medium text-gray-900">{page}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-white hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-gray-600"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-white hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-gray-600"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Modal */}
      {viewingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-up" style={{ animationDuration: '0.2s' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Contact Data</h3>
              <button onClick={() => setViewingContact(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              
              <div className="mb-6 pb-6 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <Tag size={16} className="text-indigo-500" /> Contact Tags
                </h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(viewingContact.tags || []).map((tag: string) => (
                    <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {tag}
                      {!isViewer && (
                        <button onClick={() => removeTagFromContact(viewingContact.id, tag)} disabled={updatingTags} className="hover:text-indigo-900 focus:outline-none disabled:opacity-50">
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  ))}
                  {(viewingContact.tags || []).length === 0 && (
                    <span className="text-gray-400 text-sm">No tags added</span>
                  )}
                </div>
                {!isViewer && (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add a new tag..." 
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
                      value={newTagInput}
                      onChange={e => setNewTagInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTagToContact(viewingContact.id)}
                    />
                    <button 
                      onClick={() => addTagToContact(viewingContact.id)}
                      disabled={!newTagInput.trim() || updatingTags}
                      className="px-3 py-1.5 text-sm font-medium bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {Object.keys(viewingContact.customFields || {}).map(key => (
                  <div key={key}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{key}</p>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2.5 rounded-xl border border-gray-100 break-words whitespace-pre-wrap">{String(viewingContact.customFields[key])}</p>
                  </div>
                ))}
                {Object.keys(viewingContact.customFields || {}).length === 0 && (
                   <div className="text-center py-6">
                     <p className="text-gray-500 text-sm">No custom fields attached to this contact.</p>
                   </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setViewingContact(null)} className="w-full py-2.5 bg-white border border-gray-200 shadow-sm font-semibold rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
