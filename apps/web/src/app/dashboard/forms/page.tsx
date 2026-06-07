"use client";
import { formatIST } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import { Plus, Trash2, Edit3, Share2, ClipboardList, RefreshCw, BarChart2, X, Mail, Users, MessageSquare, Bug, Calendar, Video, Briefcase, FileText, Sparkles, Link as LinkIcon, Check } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useRole } from "@/lib/useRole";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
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
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"my-forms" | "gallery">("my-forms");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  async function openSubmissions(form: any) {
    setViewingForm(form);
    setLoadingSubmissions(true);
    setSubmissions([]);
    try {
      const res = await fetch(`${API}/v1/forms/${form.id}/submissions`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setSubmissions(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSubmissions(false);
    }
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
        window.location.href = `/dashboard/forms/builder?id=${json.data.id}`;
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
                ? "bg-white text-indigo-700 shadow-sm border border-gray-200/50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
            }`}
          >
            <FileText size={16} strokeWidth={activeTab === "my-forms" ? 2.5 : 2} /> My Forms
          </button>
          <button
            onClick={() => setActiveTab("gallery")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
              activeTab === "gallery"
                ? "bg-white text-indigo-700 shadow-sm border border-gray-200/50"
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
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat ? "bg-indigo-600 text-white shadow-md" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
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
                    className="glass-card animate-fade-up text-left p-6 group relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-500/10 hover:border-indigo-200 transition-all duration-300 bg-white flex flex-col h-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                        <Icon size={24} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {template.category}
                      </span>
                    </div>
                    <h5 className="font-bold text-gray-900 text-lg mb-2 relative z-10">{template.name}</h5>
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed relative z-10 flex-1">{template.description}</p>
                    <div className="mt-6 pt-4 border-t border-gray-100 relative z-10 flex items-center text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Use Template <span className="ml-1 tracking-widest">→</span>
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
                    <iframe src={`/f/${form.id}`} className="w-full h-full border-0 pointer-events-none bg-transparent" tabIndex={-1} scrolling="no" />
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
                      <Link href={`/dashboard/forms/builder?id=${form.id}`} title="Edit Form" className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors bg-white border border-gray-200">
                        <Edit3 size={16} />
                      </Link>
                    )}
                    <button
                      title="Copy Public Link"
                      onClick={() => {
                        const url = `${window.location.origin}/f/${form.id}`;
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
      {viewingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-up" style={{ animationDuration: '0.2s' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Submissions</h3>
                <p className="text-xs text-gray-500">{viewingForm.name}</p>
              </div>
              <button onClick={() => setViewingForm(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
              {loadingSubmissions ? (
                <div className="py-12 text-center text-gray-500">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-indigo-500" />
                  Loading...
                </div>
              ) : submissions.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  No submissions yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map((sub: any) => (
                    <div key={sub.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-2">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {formatIST(sub.createdAt, true)}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">ID: {sub.id.substring(0, 8)}</div>
                      </div>
                      <div className="space-y-2">
                        {Object.keys(sub.data || {}).map(key => (
                          <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                            <span className="text-xs font-medium text-gray-500 sm:w-1/3 shrink-0">{key}:</span>
                            <span className="text-sm text-gray-900 break-words">{String(sub.data[key])}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
