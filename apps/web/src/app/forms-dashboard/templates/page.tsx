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

export default function TemplatesPage() {
  
  const [creating, setCreating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const { isViewer } = useRole();

  // Group templates by category
  const groupedTemplates = FORM_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, typeof FORM_TEMPLATES>);

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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Template Gallery</h1>
            <p className="text-gray-500 mt-1">Start from a template to create beautiful embeddable forms quickly.</p>
          </div>
        </div>

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
                  <div className="h-44 w-full bg-gray-50 relative overflow-hidden border-b border-gray-100 flex items-center justify-center p-4">
                     <div className="absolute top-3 right-3 z-10">
                       <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm bg-gray-900 text-white">
                         {template.category}
                       </span>
                     </div>
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
      </div>
    </div>
  );
}
