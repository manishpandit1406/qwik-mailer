"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Settings, Code, RefreshCw, X, GripVertical, Trash2, Palette, Layers, Webhook, CheckCircle2, Globe, Eye, Terminal, Copy, Image as ImageIcon, UploadCloud, Star, Calendar, Clock, Phone, Link2, FileUp, Sparkles, Sliders } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.qwikmailer.in";
const FRONTEND = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || "https://qwikmailer.in");
const FORMS_URL = process.env.NEXT_PUBLIC_FORMS_URL || "https://forms.qwikmailer.in";
function getToken() {
  return typeof window !== "undefined" ? (localStorage.getItem("mf_access_token") ?? "") : "";
}

function SortableField({ field, onUpdate, onRemove, schema }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as 'relative',
  };

  // Special UI for Section Break
  if (field.type === "section") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-pink-50/80 border-2 border-indigo-200/90 rounded-2xl p-5 flex gap-3 shadow-xs ${
          isDragging ? 'shadow-2xl border-indigo-400 ring-2 ring-indigo-400 scale-[1.01]' : ''
        }`}
      >
        <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-indigo-400 hover:text-indigo-600">
          <GripVertical size={20} />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 bg-white border border-indigo-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
              <Layers size={13} className="text-indigo-600" /> Section Break (Page Divider)
            </span>
            <button
              onClick={() => onRemove(field.id)}
              className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-white/60 transition-colors"
              title="Delete Section"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Section Title</label>
            <input
              type="text"
              placeholder="e.g. Work Experience & Projects"
              className="input text-sm font-semibold bg-white"
              value={field.title || field.label || ""}
              onChange={e => onUpdate(field.id, { title: e.target.value, label: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Section Description (Optional)</label>
            <textarea
              placeholder="Tell respondents what this section is about..."
              className="input text-xs bg-white resize-none h-16 text-gray-600"
              value={field.description || ""}
              onChange={e => onUpdate(field.id, { description: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-indigo-700 bg-white/70 px-3 py-1.5 rounded-lg border border-indigo-100">
            <span>📄 Questions placed below this divider will appear on a new page with Next & Back buttons.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={`bg-white border rounded-xl p-4 flex gap-3 ${isDragging ? 'shadow-xl border-indigo-300 ring-1 ring-indigo-300' : 'border-gray-200 shadow-sm'}`}>
      <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
        <GripVertical size={18} />
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {field.type}
          </span>
          <button onClick={() => onRemove(field.id)} className="text-gray-400 hover:text-red-500">
            <Trash2 size={16} />
          </button>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Field Label</label>
          <input type="text" className="input text-sm" value={field.label || ""} onChange={e => {
            const newLabel = e.target.value;
            const sanitizedLabel = newLabel.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
            
            let finalName = sanitizedLabel;
            let counter = 1;
            while (schema.some((f: any) => f.id !== field.id && f.name === finalName)) {
              counter++;
              finalName = `${sanitizedLabel}_${counter}`;
            }
            
            onUpdate(field.id, { label: newLabel, name: finalName });
          }} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Helper / Instruction Text (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Please enter your full registered name"
            className="input text-xs text-gray-600"
            value={field.helperText || ""}
            onChange={e => onUpdate(field.id, { helperText: e.target.value })}
          />
        </div>

        <div className="flex items-center mt-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
            <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" checked={field.required} disabled={field.type === 'email'} onChange={e => onUpdate(field.id, { required: e.target.checked })} />
            Required
          </label>
        </div>

        {/* Options for Checkbox, Radio, Select */}
        {['checkbox', 'radio', 'select'].includes(field.type) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="block text-xs font-medium text-gray-500 mb-2">Options</label>
            <div className="space-y-2">
              {(field.options || []).map((opt: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <input 
                    type="text" 
                    className="input text-sm py-1.5" 
                    value={opt} 
                    onChange={e => {
                      const newOptions = [...(field.options || [])];
                      newOptions[idx] = e.target.value;
                      onUpdate(field.id, { options: newOptions });
                    }} 
                  />
                  <button onClick={() => {
                    const newOptions = (field.options || []).filter((_: any, i: number) => i !== idx);
                    onUpdate(field.id, { options: newOptions });
                  }} className="text-gray-400 hover:text-red-500 p-1">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => {
                  const newOptions = [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`];
                  onUpdate(field.id, { options: newOptions });
                }}
                className="text-xs text-indigo-600 font-medium flex items-center gap-1 mt-2 hover:text-indigo-700"
              >
                <Plus size={12} /> Add Option
              </button>
            </div>
          </div>
        )}

        {/* File upload configuration */}
        {field.type === "file" && (
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
            <label className="block text-xs font-medium text-gray-500">Accepted File Formats</label>
            <input
              type="text"
              className="input text-xs"
              placeholder=".pdf, image/*, .docx"
              value={field.accept || ".pdf"}
              onChange={e => onUpdate(field.id, { accept: e.target.value })}
            />
            <p className="text-[11px] text-gray-400">Examples: <code>.pdf</code> for Resumes, <code>image/*</code> for Photos, or <code>.pdf,.docx,.zip</code></p>
          </div>
        )}

        {/* Linear scale configuration */}
        {(field.type === "range" || field.type === "scale") && (
          <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Min Label (1)</label>
              <input
                type="text"
                className="input text-xs"
                placeholder="e.g. Strongly Disagree"
                value={field.minLabel || ""}
                onChange={e => onUpdate(field.id, { minLabel: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">Max Label (5 or 10)</label>
              <input
                type="text"
                className="input text-xs"
                placeholder="e.g. Strongly Agree"
                value={field.maxLabel || ""}
                onChange={e => onUpdate(field.id, { maxLabel: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [name, setName] = useState("");
  const [status, setStatus] = useState("draft");
  const [schema, setSchema] = useState<any[]>([]);
  const [design, setDesign] = useState<any>({
    buttonColor: "#4f46e5",
    buttonText: "Subscribe",
    buttonTextColor: "#ffffff",
    title: "Join our newsletter",
    description: "Get the latest updates delivered to your inbox.",
    type: "embedded",
    // Theme settings
    bgType: "solid",
    bgColor: "#f9fafb",
    bgGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontFamily: "Inter",
    cardStyle: "card",
    accentColor: "#4f46e5",
  });
  const [settings, setSettings] = useState<any>({
    webhookUrl: "",
    targetLists: [],
    recaptcha: { enabled: false },
    successMessage: "Thank you for subscribing!",
    requireGoogleAuth: true,
  });

  const [activeTab, setActiveTab] = useState<"fields" | "design" | "settings">("fields");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiLang, setApiLang] = useState<string>("cURL");
  const [apiCodeCopied, setApiCodeCopied] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function handleAssetUpload(file: File, folder: "forms/banners" | "forms/logos") {
    if (!file) return null;
    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10 MB limit");
      return null;
    }
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch(`${API}/v1/uploads/form-asset`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base64,
        contentType: file.type || "image/jpeg",
        folder,
      }),
    });

    const json = await res.json();
    if (json.success && (json.url || json.key)) {
      return json.key ? `${API}/v1/uploads/file?key=${encodeURIComponent(json.key)}` : json.url;
    } else {
      throw new Error(json.error || "Upload failed");
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (id) fetchForm();
  }, [id]);

  async function fetchForm() {
    try {
      const res = await fetch(`${API}/v1/forms/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setName(json.data.name);
        setStatus(json.data.status);
        setSchema(json.data.schema || []);
        setDesign({
          buttonColor: "#4f46e5",
          buttonText: "Subscribe",
          buttonTextColor: "#ffffff",
          title: "Join our newsletter",
          description: "Get the latest updates delivered to your inbox.",
          type: "embedded",
          bgType: "solid",
          bgColor: "#f9fafb",
          bgGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          fontFamily: "Inter",
          cardStyle: "card",
          accentColor: "#4f46e5",
          ...(json.data.design || {})
        });
        setSettings({
          webhookUrl: "",
          targetLists: [],
          recaptcha: { enabled: false },
          successMessage: "Thank you for subscribing!",
          requireGoogleAuth: json.data.settings?.requireGoogleAuth !== false,
          ...(json.data.settings || {})
        });
      } else {
        setError("Failed to load form");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function saveForm() {
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch(`${API}/v1/forms/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, status, schema, design, settings }),
      });
      const json = await res.json();
      if (json.success) {
        setMsg("Form saved successfully");
        setTimeout(() => setMsg(""), 3000);
      } else {
        setError(json.error ?? "Failed to save");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setSchema((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function addField(type: string, customProps?: any) {
    const randomSuffix = Math.random().toString(36).substr(2, 5);

    if (type === "section") {
      const sectionCount = schema.filter(f => f.type === "section").length + 2;
      const newSection: any = {
        id: `section_${randomSuffix}`,
        type: "section",
        title: customProps?.title || `Section ${sectionCount}`,
        description: customProps?.description || "",
        name: `section_${sectionCount}`,
      };
      setSchema([...schema, newSection]);
      return;
    }

    const initialLabel = customProps?.label || `New ${type} field`;
    const sanitizedLabel = initialLabel.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    
    let finalName = sanitizedLabel;
    let counter = 1;
    // Ensure uniqueness using numbers (_2, _3) instead of random strings
    while (schema.some(f => f.name === finalName)) {
      counter++;
      finalName = `${sanitizedLabel}_${counter}`;
    }

    const newField: any = {
      id: `field_${randomSuffix}`,
      type,
      name: finalName,
      label: initialLabel,
      required: customProps?.required || false,
      helperText: customProps?.helperText || "",
      placeholder: customProps?.placeholder || "",
    };

    if (['checkbox', 'radio', 'select'].includes(type)) {
      newField.options = ['Option 1', 'Option 2', 'Option 3'];
    } else if (type === "file") {
      newField.label = customProps?.label || "Upload File / Document";
      newField.accept = customProps?.accept || ".pdf";
      newField.helperText = customProps?.helperText || "Max 10 MB (stored securely in AWS S3)";
    } else if (type === "rating") {
      newField.label = customProps?.label || "Rate your experience";
      newField.maxStars = 5;
    } else if (type === "range" || type === "scale") {
      newField.label = customProps?.label || "Linear Scale Rating";
      newField.min = 1;
      newField.max = 5;
      newField.minLabel = "Poor";
      newField.maxLabel = "Excellent";
    } else if (type === "url") {
      newField.label = customProps?.label || "Portfolio / Website Link";
      newField.placeholder = "https://...";
    } else if (type === "date") {
      newField.label = customProps?.label || "Select Date";
    } else if (type === "time") {
      newField.label = customProps?.label || "Select Time";
    }

    setSchema([...schema, newField]);
  }

  function updateField(id: string, updates: any) {
    setSchema(schema.map(f => f.id === id ? { ...f, ...updates } : f));
  }

  function removeField(id: string) {
    setSchema(schema.filter(f => f.id !== id));
  }

  const safeName = (name || "form").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const formsPublicUrl = `${FORMS_URL}/f/${safeName}/${id}`;
  const iframeEmbedCode = `<iframe src="${formsPublicUrl}" width="100%" height="400" frameborder="0" style="border:0; border-radius: 8px; overflow:hidden;" allowtransparency="true"></iframe>`;

  const generateApiPayload = () => {
    const payload: any = {};
    schema.forEach(f => {
      const key = f.label || f.name;
      payload[key] = f.type === 'email' ? 'user@example.com' : 'value';
    });
    return JSON.stringify({ data: payload }, null, 2);
  };

  const curlCode = `curl -X POST ${API}/v1/forms/${id}/submit \\
  -H "Content-Type: application/json" \\
  -d '${generateApiPayload()}'`;

  const jsCode = `fetch('${API}/v1/forms/${id}/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(${generateApiPayload()})
})
.then(res => res.json())
.then(data => console.log(data));`;

  const pythonCode = `import requests

url = "${API}/v1/forms/${id}/submit"
payload = ${generateApiPayload()}

response = requests.post(url, json=payload)
print(response.json())`;

  const phpCode = `<?php

$ch = curl_init('${API}/v1/forms/${id}/submit');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, '${generateApiPayload().replace(/\n/g, '').replace(/'/g, "\\'")}');

$response = curl_exec($ch);
curl_close($ch);

echo $response;`;

  const javaCode = `import java.net.http.*;
import java.net.URI;

HttpClient client = HttpClient.newHttpClient();

String body = """
${generateApiPayload().split('\n').map(l => '    ' + l).join('\n')}""";

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("${API}/v1/forms/${id}/submit"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(body))
    .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());`;

  const goCode = `package main

import (
	"bytes"
	"fmt"
	"net/http"
)

func main() {
	payload := []byte(\`${generateApiPayload()}\`)

	req, _ := http.NewRequest("POST", "${API}/v1/forms/${id}/submit", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")

	resp, _ := http.DefaultClient.Do(req)
	defer resp.Body.Close()

	fmt.Println("Status:", resp.Status)
}`;

  const getCodeContent = (lang: string) => {
    switch (lang) {
      case 'cURL': return curlCode;
      case 'JavaScript (Fetch)': return jsCode;
      case 'Python (Requests)': return pythonCode;
      case 'PHP (cURL)': return phpCode;
      case 'Java': return javaCode;
      case 'Go': return goCode;
      default: return curlCode;
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><RefreshCw className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Topbar */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/forms" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="h-6 w-px bg-gray-200"></div>
          <input 
            type="text" 
            className="text-lg font-bold text-gray-900 border-none bg-transparent focus:ring-0 p-0 w-64 hover:bg-gray-50 px-2 py-1 rounded transition-colors focus:bg-white" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="Form Name"
          />
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ml-2 ${status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {status}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="text-sm font-medium bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <a href={`${formsPublicUrl}?preview=true`} target="_blank" className="btn-secondary flex items-center gap-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm font-medium">
            <Eye size={16} /> Preview
          </a>
          <button className="btn-secondary flex items-center gap-2 bg-white" onClick={() => setShowApiModal(true)}>
            <Terminal size={16} /> API Code
          </button>
          <button className="btn-secondary flex items-center gap-2 bg-white" onClick={() => setShowShareModal(true)}>
            <Code size={16} /> Share & Embed
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={saveForm} disabled={saving}>
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            Save Form
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="flex border-b border-gray-200">
            <button className={`flex-1 py-4 text-sm font-semibold border-b-2 flex justify-center items-center gap-2 ${activeTab === 'fields' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab("fields")}>
              <Layers size={16} /> Fields
            </button>
            <button className={`flex-1 py-4 text-sm font-semibold border-b-2 flex justify-center items-center gap-2 ${activeTab === 'design' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab("design")}>
              <Palette size={16} /> Design
            </button>
            <button className={`flex-1 py-4 text-sm font-semibold border-b-2 flex justify-center items-center gap-2 ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab("settings")}>
              <Settings size={16} /> Settings
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'fields' && (
              <div className="space-y-6">
                {/* ── Section Break / Page Divider ── */}
                <div className="pt-2">
                  <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl mb-5">
                    <button
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all"
                      onClick={() => addField("section")}
                    >
                      <Layers size={15} /> + Add Section (New Page)
                    </button>
                    <p className="text-[10px] text-indigo-700 mt-2 text-center">
                      Splits your form into multi-step pages with Next & Back buttons (like Google Forms).
                    </p>
                  </div>

                  {/* ── S3 Cloud File Upload ── */}
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <UploadCloud size={13} className="text-indigo-600" /> File Storage (AWS S3)
                  </h4>
                  <div className="mb-5">
                    <button
                      className="w-full flex items-center justify-between px-3.5 py-2.5 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl text-xs font-bold text-indigo-900 transition-all group"
                      onClick={() => addField("file")}
                    >
                      <span className="flex items-center gap-2">
                        <FileUp size={16} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                        File Upload (Resume, PDF, Images)
                      </span>
                      <span className="text-[10px] bg-indigo-600 text-white font-mono px-2 py-0.5 rounded-full">S3</span>
                    </button>
                  </div>

                  {/* ── Advanced Inputs ── */}
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-indigo-600" /> Interactive Inputs
                  </h4>
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors" onClick={() => addField("rating")}>
                      <Star size={14} className="text-amber-500" /> Star Rating
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors" onClick={() => addField("range")}>
                      <Sliders size={14} className="text-indigo-500" /> Linear Scale
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors" onClick={() => addField("url")}>
                      <Link2 size={14} className="text-blue-500" /> Website / URL
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors" onClick={() => addField("tel")}>
                      <Phone size={14} className="text-emerald-500" /> Phone Number
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors" onClick={() => addField("date")}>
                      <Calendar size={14} className="text-rose-500" /> Date Picker
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors" onClick={() => addField("time")}>
                      <Clock size={14} className="text-purple-500" /> Time Picker
                    </button>
                  </div>

                  {/* ── Standard Fields ── */}
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Standard Fields</h4>
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors" onClick={() => addField("text")}>
                      <Plus size={14} /> Short Answer
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors" onClick={() => addField("textarea")}>
                      <Plus size={14} /> Paragraph
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors" onClick={() => addField("radio")}>
                      <Plus size={14} /> Multiple Choice
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors" onClick={() => addField("checkbox")}>
                      <Plus size={14} /> Checkboxes
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors col-span-2" onClick={() => addField("select")}>
                      <Plus size={14} /> Dropdown List
                    </button>
                  </div>

                  {/* ── Quick Presets ── */}
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quick Presets</h4>
                  <div className="flex flex-col gap-2">
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => addField("text", { name: "fullName", label: "Full Name", required: true })}>
                      <Plus size={14} /> Full Name
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => addField("email", { name: "email", label: "Email Address", required: true })}>
                      <Plus size={14} /> Email Address
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'design' && (
              <div className="space-y-6">

                {/* ── Cover Banner ── */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-indigo-600" /> Cover Banner
                    </label>
                    {design.bannerUrl && (
                      <button
                        type="button"
                        onClick={() => setDesign({ ...design, bannerUrl: "" })}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {design.bannerUrl ? (
                    <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 max-h-36 flex items-center justify-center p-1">
                      <img src={design.bannerUrl} alt="Banner Preview" className="w-full h-auto max-h-32 object-contain" />
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-white transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingBanner}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingBanner(true);
                          try {
                            const url = await handleAssetUpload(file, "forms/banners");
                            if (url) setDesign({ ...design, bannerUrl: url });
                          } catch (err: any) {
                            alert(err.message || "Banner upload failed");
                          } finally {
                            setUploadingBanner(false);
                            e.target.value = "";
                          }
                        }}
                      />
                      {uploadingBanner ? (
                        <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
                          <RefreshCw size={14} className="animate-spin" /> Uploading to S3…
                        </div>
                      ) : (
                        <>
                          <UploadCloud size={20} className="text-gray-400 mb-1" />
                          <span className="text-xs font-semibold text-gray-700">Upload Cover Banner</span>
                          <span className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, WebP up to 10MB</span>
                        </>
                      )}
                    </label>
                  )}
                </div>

                {/* ── Form Logo ── */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-indigo-600" /> Form Logo
                    </label>
                    {design.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setDesign({ ...design, logoUrl: "" })}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {design.logoUrl ? (
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl border border-gray-200 overflow-hidden bg-white p-1">
                        <img src={design.logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                      </div>
                      <span className="text-xs text-gray-500 font-medium">Logo active</span>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-3 flex items-center justify-center gap-2 text-center cursor-pointer bg-white transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingLogo}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingLogo(true);
                          try {
                            const url = await handleAssetUpload(file, "forms/logos");
                            if (url) setDesign({ ...design, logoUrl: url });
                          } catch (err: any) {
                            alert(err.message || "Logo upload failed");
                          } finally {
                            setUploadingLogo(false);
                            e.target.value = "";
                          }
                        }}
                      />
                      {uploadingLogo ? (
                        <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
                          <RefreshCw size={14} className="animate-spin" /> Uploading to S3…
                        </div>
                      ) : (
                        <>
                          <UploadCloud size={16} className="text-gray-400" />
                          <span className="text-xs font-semibold text-gray-700">Upload Square Logo</span>
                        </>
                      )}
                    </label>
                  )}
                </div>

                {/* ── Font Family ── */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Font Family</label>
                  <select className="input text-sm" value={design.fontFamily || 'Inter'} onChange={e => setDesign({...design, fontFamily: e.target.value})}>
                    {['Inter','Poppins','Space Grotesk','Lato','DM Sans'].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                {/* ── Background ── */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Background</label>
                  <div className="flex gap-2 mb-3">
                    {(['solid','gradient','image'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setDesign({...design, bgType: t})}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all capitalize ${
                          design.bgType === t
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {design.bgType === 'solid' && (
                    <div className="flex items-center gap-2">
                      <input type="color" className="w-9 h-9 rounded border border-gray-200 cursor-pointer" value={design.bgColor || '#f9fafb'} onChange={e => setDesign({...design, bgColor: e.target.value})} />
                      <input type="text" className="input text-sm font-mono" placeholder="#f9fafb" value={design.bgColor || ''} onChange={e => setDesign({...design, bgColor: e.target.value})} />
                    </div>
                  )}

                  {design.bgType === 'gradient' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
                          'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
                          'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
                          'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)',
                          'linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
                          'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)',
                          'linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%)',
                          'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
                        ].map((g, i) => (
                          <button
                            key={i}
                            onClick={() => setDesign({...design, bgGradient: g})}
                            className={`h-10 rounded-lg border-2 transition-all ${
                              design.bgGradient === g ? 'border-gray-900 scale-105' : 'border-transparent hover:scale-105'
                            }`}
                            style={{ background: g }}
                          />
                        ))}
                      </div>
                      <input type="text" className="input text-xs font-mono" placeholder="linear-gradient(...)" value={design.bgGradient || ''} onChange={e => setDesign({...design, bgGradient: e.target.value})} />
                    </div>
                  )}

                  {design.bgType === 'image' && (
                    <input type="url" className="input text-sm" placeholder="https://example.com/bg.jpg" value={design.bgImageUrl || ''} onChange={e => setDesign({...design, bgImageUrl: e.target.value})} />
                  )}
                </div>

                {/* ── Card Style ── */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Card Style</label>
                  <div className="flex gap-2">
                    {[
                      { val: 'card', label: 'Card' },
                      { val: 'minimal', label: 'Minimal' },
                      { val: 'fullscreen', label: 'Fullscreen' },
                    ].map(({ val, label }) => (
                      <button
                        key={val}
                        onClick={() => setDesign({...design, cardStyle: val})}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          design.cardStyle === val
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Accent Color ── */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" className="w-9 h-9 rounded border border-gray-200 cursor-pointer" value={design.accentColor || '#4f46e5'} onChange={e => setDesign({...design, accentColor: e.target.value, buttonColor: e.target.value})} />
                    <input type="text" className="input text-sm font-mono" value={design.accentColor || ''} onChange={e => setDesign({...design, accentColor: e.target.value, buttonColor: e.target.value})} />
                  </div>
                </div>

                {/* ── Button ── */}
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Submit Button</label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-600">Button Text</label>
                      <input type="text" className="input" value={design.buttonText || ''} onChange={e => setDesign({...design, buttonText: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-600">Button Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" className="w-8 h-8 rounded border border-gray-200 cursor-pointer" value={design.buttonColor || '#4f46e5'} onChange={e => setDesign({...design, buttonColor: e.target.value})} />
                          <input type="text" className="input text-xs font-mono" value={design.buttonColor || ''} onChange={e => setDesign({...design, buttonColor: e.target.value})} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-600">Text Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" className="w-8 h-8 rounded border border-gray-200 cursor-pointer" value={design.buttonTextColor || '#ffffff'} onChange={e => setDesign({...design, buttonTextColor: e.target.value})} />
                          <input type="text" className="input text-xs font-mono" value={design.buttonTextColor || ''} onChange={e => setDesign({...design, buttonTextColor: e.target.value})} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Require Google Sign-In */}
                <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900">Require Google Sign-In</h4>
                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                            Verified Email
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          Respondents must sign in with Google to fill out this form. Their verified Google email is automatically recorded with each submission.
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.requireGoogleAuth !== false}
                        onChange={e => setSettings({ ...settings, requireGoogleAuth: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {settings.requireGoogleAuth !== false && (
                    <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50/60 px-3 py-2 rounded-xl">
                      <CheckCircle2 size={14} className="text-indigo-600 shrink-0" />
                      <span>Form authentication only. Respondents are not logged into your Qwik Mailer account.</span>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                  <h4 className="text-sm font-bold text-blue-900 mb-1 flex items-center gap-2"><Webhook size={16} /> Webhook URL</h4>
                  <p className="text-xs text-blue-700 mb-3">Send submission data to an external service in real-time.</p>
                  <input type="url" className="input text-sm" placeholder="https://your-api.com/webhook" value={settings.webhookUrl || ""} onChange={e => setSettings({...settings, webhookUrl: e.target.value})} />
                </div>

                <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                  <h4 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2"><CheckCircle2 size={16} /> Success Message</h4>
                  <p className="text-xs text-gray-500 mb-3">Shown to the user after successful submission.</p>
                  <input type="text" className="input text-sm" value={settings.successMessage || ""} onChange={e => setSettings({...settings, successMessage: e.target.value})} />
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Main Canvas (Editor) */}
        <div className="flex-1 bg-gray-100 overflow-y-auto p-8 flex flex-col items-center">
          <div className="w-full max-w-3xl space-y-6">
            
            {/* Form Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {design.bannerUrl && (
                <div className="relative w-full group bg-gray-50 border-b border-gray-100 flex items-center justify-center overflow-hidden">
                  <img src={design.bannerUrl} alt="Banner" className="w-full h-auto max-h-72 object-contain" />
                  <button
                    type="button"
                    onClick={() => setDesign({ ...design, bannerUrl: "" })}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black transition-colors"
                    title="Remove Banner"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="p-8">
                <div className="flex items-center gap-4 mb-4">
                  {design.logoUrl && (
                    <div className="relative shrink-0 group">
                      <img src={design.logoUrl} alt="Logo" className="w-14 h-14 rounded-xl object-contain border border-gray-200 p-1 shadow-xs bg-white" />
                      <button
                        type="button"
                        onClick={() => setDesign({ ...design, logoUrl: "" })}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-xs"
                        title="Remove Logo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  <input 
                    type="text" 
                    className="w-full text-3xl sm:text-4xl font-bold text-gray-900 border-none bg-transparent focus:ring-0 p-0 focus:outline-none placeholder-gray-300"
                    placeholder="Form Title"
                    value={design.title || ""} 
                    onChange={e => setDesign({...design, title: e.target.value})} 
                  />
                </div>
                <textarea 
                  className="w-full text-gray-600 text-sm border-none bg-transparent focus:ring-0 p-0 resize-none focus:outline-none placeholder-gray-400 overflow-hidden min-h-[40px]"
                  placeholder="Form Description"
                  value={design.description || ""} 
                  onChange={e => {
                    setDesign({...design, description: e.target.value});
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }} 
                />
              </div>
            </div>

            {/* Form Fields */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={schema.map(f => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4 pb-20">
                  {schema.map(field => (
                    <SortableField key={field.id} field={field} onUpdate={updateField} onRemove={removeField} schema={schema} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            
            {/* Empty State */}
            {schema.length === 0 && (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-500">
                Click on the fields in the sidebar to add them to your form.
              </div>
            )}
            
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">Share & Embed Form</h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><Globe size={18} /> Hosted Link</h4>
                <p className="text-sm text-gray-500 mb-3">Share this direct link with your audience. No coding required.</p>
                <div className="flex items-center gap-2">
                  <input type="text" readOnly className="input font-mono text-sm bg-gray-50" value={formsPublicUrl} />
                  <button className="btn-secondary whitespace-nowrap" onClick={() => {navigator.clipboard.writeText(formsPublicUrl); alert("Copied!");}}>Copy Link</button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><Code size={18} /> Iframe Embed (Like Google Forms)</h4>
                <p className="text-sm text-gray-500 mb-3">Copy and paste this code into your website (WordPress, Webflow, custom HTML).</p>
                <div className="relative">
                  <textarea readOnly className="input font-mono text-sm bg-gray-900 text-gray-300 h-24" value={iframeEmbedCode} />
                  <button className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" onClick={() => {navigator.clipboard.writeText(iframeEmbedCode); alert("Copied!");}}>Copy Code</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Modal */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowApiModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">Custom API Integration</h3>
              <button onClick={() => setShowApiModal(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <p className="text-sm text-gray-600">Submit form data directly from your own code. The JSON keys automatically match your form fields.</p>
              
              <div className="glass-card overflow-hidden">
                <div className="px-5 pt-4 pb-0 flex items-center justify-between border-b border-gray-100">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Integration Code
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getCodeContent(apiLang));
                      setApiCodeCopied(true);
                      setTimeout(() => setApiCodeCopied(false), 2000);
                    }}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600 mb-3"
                  >
                    {apiCodeCopied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    {apiCodeCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="flex border-b border-gray-100 px-5 gap-0 overflow-x-auto bg-gray-50 scrollbar-hide">
                  {["cURL", "JavaScript (Fetch)", "Python (Requests)", "PHP (cURL)", "Java", "Go"].map((l: any) => (
                    <button
                      key={l}
                      onClick={() => setApiLang(l)}
                      className="px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all border-b-2"
                      style={{
                        borderBottomColor: apiLang === l ? "var(--accent, #4f46e5)" : "transparent",
                        color: apiLang === l ? "var(--accent, #4f46e5)" : "var(--text-muted, #64748b)",
                        background: "transparent",
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <pre
                  className="text-xs overflow-x-auto p-5 m-0 leading-relaxed"
                  style={{
                    background: "#f8f9fa",
                    color: "#1e293b",
                    fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                    minHeight: 120,
                  }}
                >
                  {getCodeContent(apiLang)}
                </pre>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Global Alerts */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 text-red-700 px-4 py-3 rounded-xl shadow-lg border border-red-200 flex items-center gap-3 z-50 animate-fade-up">
          <span className="font-medium">{error}</span>
          <button onClick={() => setError("")}><X size={16} /></button>
        </div>
      )}
      {msg && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 animate-fade-up">
          <span className="font-medium">{msg}</span>
        </div>
      )}
    </div>
  );
}

export default function FormBuilder() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><RefreshCw className="animate-spin text-indigo-600 mx-auto" /></div>}>
      <BuilderContent />
    </Suspense>
  );
}
