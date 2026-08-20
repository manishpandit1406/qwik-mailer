"use client";
import { formatIST } from "@/lib/dateUtils";
import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit3, Share2, ClipboardList, RefreshCw, BarChart2, X, Mail, Users, MessageSquare, Bug, Calendar, Video, Briefcase, FileText, Sparkles, Link as LinkIcon, Check, Download } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useRole } from "@/lib/useRole";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const FORMS_URL = process.env.NEXT_PUBLIC_FORMS_URL ?? "https://forms.qwikmailer.in";
function getToken() {
  return typeof window !== "undefined" ? (localStorage.getItem("mf_access_token") ?? "") : "";
}

const FORM_TEMPLATES = [
  {
    id: "blank",
    category: "Basic",
    name: "Blank Form",
    description: "Start from scratch with just an email field",
    icon: Plus,
    schema: [
      { id: "field_email", type: "email", name: "Email", label: "Email Address", required: true }
    ]
  },
  {
    id: "newsletter",
    category: "Lead Generation",
    name: "Newsletter Signup",
    description: "Grow your audience with a simple subscribe form",
    icon: Mail,
    schema: [
      { id: "field_name", type: "text", name: "First Name", label: "First Name", required: false },
      { id: "field_email", type: "email", name: "Email", label: "Email Address", required: true }
    ]
  },
  {
    id: "waitlist",
    category: "Lead Generation",
    name: "Early Access Waitlist",
    description: "Capture interest before your launch",
    icon: Users,
    schema: [
      { id: "field_name", type: "text", name: "Full Name", label: "Full Name", required: true },
      { id: "field_email", type: "email", name: "Work Email", label: "Work Email", required: true },
      { id: "field_job", type: "text", name: "Job Title", label: "Job Title", required: false }
    ]
  },
  {
    id: "contact",
    category: "Contact & Support",
    name: "Contact Us",
    description: "Let visitors send you messages directly",
    icon: MessageSquare,
    schema: [
      { id: "field_name", type: "text", name: "Name", label: "Name", required: true },
      { id: "field_email", type: "email", name: "Email", label: "Email Address", required: true },
      { id: "field_subject", type: "text", name: "Subject", label: "Subject", required: false },
      { id: "field_message", type: "textarea", name: "Message", label: "How can we help you?", required: true }
    ]
  },
  {
    id: "feedback",
    category: "Contact & Support",
    name: "Feedback & Bug Report",
    description: "Collect valuable user feedback",
    icon: Bug,
    schema: [
      { id: "field_email", type: "email", name: "Email", label: "Email Address", required: true },
      { id: "field_type", type: "select", name: "Feedback Type", label: "What is this regarding?", required: true, options: ["Bug Report", "Feature Request", "General Feedback"] },
      { id: "field_details", type: "textarea", name: "Details", label: "Please provide details", required: true }
    ]
  },
  {
    id: "event",
    category: "Events & Registration",
    name: "Event Registration",
    description: "Register attendees for your upcoming event",
    icon: Calendar,
    schema: [
      { id: "field_name", type: "text", name: "Name", label: "Full Name", required: true },
      { id: "field_email", type: "email", name: "Email", label: "Email Address", required: true },
      { id: "field_company", type: "text", name: "Company", label: "Company", required: false },
      { id: "field_diet", type: "text", name: "Dietary", label: "Dietary Requirements", required: false }
    ]
  },
  {
    id: "webinar",
    category: "Events & Registration",
    name: "Webinar Signup",
    description: "Get signups for your online webinar",
    icon: Video,
    schema: [
      { id: "field_name", type: "text", name: "Name", label: "Full Name", required: true },
      { id: "field_email", type: "email", name: "Email", label: "Work Email", required: true },
      { id: "field_role", type: "text", name: "Role", label: "Job Role", required: false }
    ]
  },
  {
    id: "demo",
    category: "Sales",
    name: "Book a Demo",
    description: "Qualify leads and schedule sales calls",
    icon: Briefcase,
    schema: [
      { id: "field_name", type: "text", name: "Name", label: "Full Name", required: true },
      { id: "field_email", type: "email", name: "Email", label: "Work Email", required: true },
      { id: "field_size", type: "select", name: "Company Size", label: "Company Size", required: true, options: ["1-10", "11-50", "51-200", "201+"] },
      { id: "field_usecase", type: "textarea", name: "Use Case", label: "What are you looking to solve?", required: false }
    ]
  }
];

export default function FormsPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewingForm, setViewingForm] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsTotal, setSubmissionsTotal] = useState(0);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsSearch, setSubmissionsSearch] = useState("");
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"my-forms" | "gallery">("my-forms");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const { isViewer } = useRole();

  // Group templates by category
  const groupedTemplates = FORM_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, typeof FORM_TEMPLATES>);

  useEffect(() => {
    fetchForms();
  }, []);

  async function fetchForms() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/forms`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setForms(json.data);
      } else {
        setError(json.error ?? "Failed to load forms");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function openSubmissions(form: any, page = 1) {
    setViewingForm(form);
    setLoadingSubmissions(true);
    if (page === 1) setSubmissions([]);
    setSubmissionsPage(page);
    setSubmissionsSearch("");
    setExpandedRow(null);
    try {
      const res = await fetch(`${API}/v1/forms/${form.id}/submissions?page=${page}&limit=50`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setSubmissions(json.data);
        setSubmissionsTotal(json.total ?? json.data.length);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSubmissions(false);
    }
  }

  async function loadMoreSubmissions(form: any, page: number) {
    setLoadingSubmissions(true);
    setSubmissionsPage(page);
    try {
      const res = await fetch(`${API}/v1/forms/${form.id}/submissions?page=${page}&limit=50`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setSubmissions(json.data);
        setSubmissionsTotal(json.total ?? json.data.length);
      }
    } catch {}
    finally { setLoadingSubmissions(false); }
  }

  async function exportCSV(formId: string, formName: string) {
    setExportingCsv(true);
    try {
      const res = await fetch(`${API}/v1/forms/${formId}/submissions/export`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) { alert("Export failed"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${formName.replace(/[^a-z0-9_-]/gi, "_")}_submissions.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Export failed"); }
    finally { setExportingCsv(false); }
  }

  async function deleteSubmission(formId: string, subId: string) {
    if (!confirm("Delete this submission? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API}/v1/forms/${formId}/submissions/${subId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setSubmissions(prev => prev.filter(s => s.id !== subId));
        setSubmissionsTotal(prev => Math.max(0, prev - 1));
        // Update local form submissions counter
        setForms(prev => prev.map(f => f.id === formId ? { ...f, submissions: Math.max(0, f.submissions - 1) } : f));
      } else {
        alert(json.error ?? "Failed to delete");
      }
    } catch { alert("Network error"); }
  }

  async function deleteForm(id: string) {
    if (!confirm("Are you sure you want to delete this form? This will also delete all its submission data.")) return;
    try {
      const res = await fetch(`${API}/v1/forms/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setForms(forms.filter(f => f.id !== id));
      } else {
        alert(json.error ?? "Failed to delete");
      }
    } catch {
      alert("Network error");
    }
  }

  async function createForm(template: typeof FORM_TEMPLATES[0]) {
    setCreating(true);
    try {
      const res = await fetch(`${API}/v1/forms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: template.name === "Blank Form" ? "Untitled Form" : template.name,
          status: "draft",
          schema: template.schema
        })
      });
      const json = await res.json();
      if (json.success) {
        window.location.href = `/forms-dashboard/builder?id=${json.data.id}`;
      } else {
        alert(json.error ?? "Failed to create form");
      }
    } catch {
      alert("Network error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Signup Forms</h1>
            <p className="text-gray-500 mt-1">Create embeddable forms to collect leads and grow your audience.</p>
          </div>
          {!isViewer && (
            <button className="btn-primary flex items-center gap-2" onClick={() => setActiveTab("gallery")}>
              <Plus size={16} /> New Form
            </button>
          )}
        </div>

        {/* Sleek Segmented Tabs */}
        <div className="flex items-center bg-gray-100/80 p-1 rounded-xl w-max border border-gray-200/60 shadow-inner">
          <button
            onClick={() => setActiveTab("my-forms")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeTab === "my-forms"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200/50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
            }`}
          >
            <FileText size={16} strokeWidth={activeTab === "my-forms" ? 2.5 : 2} /> My Forms
          </button>
          <button
            onClick={() => setActiveTab("gallery")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeTab === "gallery"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200/50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
            }`}
          >
            <Sparkles size={16} strokeWidth={activeTab === "gallery" ? 2.5 : 2} /> Template Gallery
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {activeTab === "gallery" ? (
          <div className="animate-fade-in space-y-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {["All", ...Object.keys(groupedTemplates)].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat ? "bg-gray-900 text-white shadow-md" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
              {FORM_TEMPLATES.filter(t => selectedCategory === "All" || t.category === selectedCategory).map((template) => {
                const Icon = template.icon;
                return (
                  <button 
                    key={template.id}
                    onClick={() => createForm(template)}
                    disabled={creating}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 transition-all group flex flex-col h-full text-left disabled:opacity-50 disabled:cursor-not-allowed w-full animate-fade-up"
                  >
                    {/* Thumbnail Preview area */}
                    <div className="h-44 w-full bg-gray-50 relative overflow-hidden border-b border-gray-100 flex items-center justify-center p-4">
                       <div className="absolute top-3 right-3 z-10">
                         <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm bg-gray-900 text-white">
                           {template.category}
                         </span>
                       </div>
                       
                       {/* Real Content Mock Form */}
                       <div className="w-[300px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 p-5 transform scale-[0.65] origin-top absolute top-6 transition-transform group-hover:scale-[0.68]">
                         <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{template.name}</h2>
                         <p className="text-sm text-gray-500 mb-5 leading-relaxed">{template.description}</p>
                         
                         <div className="space-y-4">
                            {template.schema.slice(0, 2).map((field: any, idx: number) => (
                               <div key={idx} className="text-left">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                  </label>
                                  <div className="w-full h-10 bg-white border border-gray-200 rounded-lg shadow-sm"></div>
                               </div>
                            ))}
                            <div className="h-10 w-full bg-gray-900 rounded-lg mt-4 flex items-center justify-center">
                               <span className="text-sm text-white font-bold">Submit</span>
                            </div>
                         </div>
                       </div>
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-gray-900 text-base mb-1">{template.name}</h3>
                      <p className="text-xs text-gray-500 mb-4 line-clamp-2">{template.description}</p>
                      
                      <div className="mt-auto pt-3 flex items-center text-xs font-semibold text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity">
                        Use Template <span className="ml-1 tracking-widest">→</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : loading ? (
          <div className="py-12 text-center text-sm text-gray-500">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-indigo-500" />
            Loading forms...
          </div>
        ) : forms.length === 0 ? (
          <div className="py-16 text-center bg-white border border-dashed border-gray-300 rounded-2xl">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardList size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No forms yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">Create your first form to start collecting subscribers, leads, or contact messages directly into your CRM.</p>
            {!isViewer && (
              <button className="btn-primary flex items-center gap-2 mx-auto" onClick={() => setActiveTab("gallery")}>
                <Plus size={16} /> Browse Templates
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map(form => (
              <div key={form.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
                {/* Thumbnail Preview area */}
                <div className="h-44 w-full bg-gray-50 relative overflow-hidden border-b border-gray-100 pointer-events-none flex justify-center">
                  <div className="absolute top-3 right-3 z-10 pointer-events-auto">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm ${form.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                      {form.status}
                    </span>
                  </div>
                  <div style={{ width: '500px', height: '600px', transform: 'scale(0.65)', transformOrigin: 'top center', marginTop: '-15px' }}>
                    <iframe src={`/f/${form.id}?preview=true`} className="w-full h-full border-0 pointer-events-none bg-transparent" tabIndex={-1} scrolling="no" />
                  </div>
                  <div className="absolute inset-0 bg-transparent" /> {/* Overlay to capture clicks */}
                </div>
                
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-1 pr-2">{form.name}</h3>
                  <p className="text-[11px] text-gray-400 mb-4">Created {formatIST(form.createdAt, false)}</p>
                  
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex-1 bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <div className="text-[11px] text-gray-500 font-medium mb-0.5">Views</div>
                      <div className="text-lg font-bold text-gray-900">{form.views.toLocaleString()}</div>
                    </div>
                    <button 
                      onClick={() => openSubmissions(form)}
                      className="flex-1 bg-indigo-50 rounded-lg p-2.5 border border-indigo-100 hover:bg-indigo-100 transition-colors text-left cursor-pointer block"
                    >
                      <div className="text-[11px] text-indigo-600 font-medium mb-0.5">
                        Submissions
                      </div>
                      <div className="text-lg font-bold text-indigo-900">{form.submissions.toLocaleString()}</div>
                    </button>
                  </div>
                  
                  {form.views > 0 ? (
                    <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1.5 font-medium h-4">
                      <BarChart2 size={12} className="text-green-500" />
                      {((form.submissions / form.views) * 100).toFixed(1)}% conversion rate
                    </div>
                  ) : <div className="mt-2 h-4" />}
                </div>
                
                <div className="border-t border-gray-100 bg-gray-50 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {!isViewer && (
                      <Link href={`/forms-dashboard/builder?id=${form.id}`} title="Edit Form" className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors bg-white border border-gray-200">
                        <Edit3 size={16} />
                      </Link>
                    )}
                    <button
                      title="Copy Public Link"
                      onClick={() => {
                        const safeName = (form.name || "form").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                        const url = `${FORMS_URL}/f/${safeName}/${form.id}`;
                        navigator.clipboard.writeText(url);
                        setCopiedId(form.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors bg-white border border-gray-200"
                    >
                      {copiedId === form.id ? <Check size={16} className="text-emerald-600" /> : <LinkIcon size={16} />}
                    </button>
                  </div>
                  {!isViewer && (
                    <button 
                      onClick={() => deleteForm(form.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submissions Modal */}
      {viewingForm && (() => {
        // Derive column keys from all submissions
        const allKeys = Array.from(
          submissions.reduce((s, sub) => {
            Object.keys(sub.data ?? {}).forEach(k => s.add(k));
            return s;
          }, new Set<string>())
        ) as string[];

        // Client-side search filter
        const filtered = submissionsSearch.trim()
          ? submissions.filter(sub =>
              JSON.stringify(sub.data ?? {}).toLowerCase().includes(submissionsSearch.toLowerCase())
            )
          : submissions;

        const totalPages = Math.ceil(submissionsTotal / 50);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-up"
            style={{ animationDuration: '0.2s' }}
            onClick={() => setViewingForm(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Submissions</h3>
                  <p className="text-xs text-gray-500">{viewingForm.name} &mdash; {submissionsTotal} total</p>
                </div>
                <div className="flex items-center gap-2">
                  {!isViewer && (
                    <button
                      onClick={() => exportCSV(viewingForm.id, viewingForm.name)}
                      disabled={exportingCsv || submissions.length === 0}
                      className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                    >
                      {exportingCsv ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                      Export CSV
                    </button>
                  )}
                  <button onClick={() => setViewingForm(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="px-5 py-3 border-b border-gray-100 shrink-0">
                <input
                  type="text"
                  className="input text-sm py-1.5"
                  placeholder="Search submissions..."
                  value={submissionsSearch}
                  onChange={e => setSubmissionsSearch(e.target.value)}
                />
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                {loadingSubmissions ? (
                  <div className="py-12 text-center text-gray-500">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-indigo-500" />
                    Loading...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    {submissionsSearch ? "No matching submissions." : "No submissions yet."}
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th>Submitted At</th>
                        {allKeys.map(k => (
                          <th key={k} className="max-w-[180px]">{k}</th>
                        ))}
                        {!isViewer && <th className="w-16 text-center">Delete</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((sub: any, idx: number) => (
                        <React.Fragment key={sub.id}>
                          <tr
                            className="cursor-pointer"
                            onClick={() => setExpandedRow(expandedRow === sub.id ? null : sub.id)}
                          >
                            <td className="text-gray-400 text-xs font-mono">{(submissionsPage - 1) * 50 + idx + 1}</td>
                            <td className="text-xs text-gray-500 whitespace-nowrap">
                              {formatIST(sub.createdAt, true)}
                            </td>
                            {allKeys.map(k => (
                              <td key={k} className="max-w-[200px]">
                                <span className="block truncate text-sm">
                                  {Array.isArray(sub.data?.[k])
                                    ? (sub.data[k] as string[]).join(", ")
                                    : String(sub.data?.[k] ?? "")}
                                </span>
                              </td>
                            ))}
                            {!isViewer && (
                              <td className="text-center" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => deleteSubmission(viewingForm.id, sub.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            )}
                          </tr>
                          {/* Expanded detail row */}
                          {expandedRow === sub.id && (
                            <tr key={`${sub.id}-expand`}>
                              <td colSpan={allKeys.length + (isViewer ? 2 : 3)} className="bg-gray-50 px-6 py-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {Object.entries(sub.data ?? {}).map(([k, v]) => (
                                    <div key={k}>
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{k}</div>
                                      <div className="text-sm text-gray-900 break-words">
                                        {Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "")}
                                      </div>
                                    </div>
                                  ))}
                                  <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">IP</div>
                                    <div className="text-sm text-gray-500 font-mono">{sub.ip ?? "—"}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Submission ID</div>
                                    <div className="text-xs text-gray-400 font-mono">{sub.id}</div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between shrink-0">
                  <span className="text-xs text-gray-500">
                    Page {submissionsPage} of {totalPages} &bull; {submissionsTotal} submissions
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={submissionsPage <= 1 || loadingSubmissions}
                      onClick={() => loadMoreSubmissions(viewingForm, submissionsPage - 1)}
                      className="btn-secondary text-xs py-1 px-3 disabled:opacity-40"
                    >
                      ← Prev
                    </button>
                    <button
                      disabled={submissionsPage >= totalPages || loadingSubmissions}
                      onClick={() => loadMoreSubmissions(viewingForm, submissionsPage + 1)}
                      className="btn-secondary text-xs py-1 px-3 disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
