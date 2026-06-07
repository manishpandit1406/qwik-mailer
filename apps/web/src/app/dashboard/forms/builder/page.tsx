"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Settings, Code, RefreshCw, X, GripVertical, Trash2, Palette, Layers, Webhook, CheckCircle2, Globe, Eye, Terminal, Copy } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const FRONTEND = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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
        <div className="flex items-center mt-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
            <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" checked={field.required} disabled={field.type === 'email'} onChange={e => onUpdate(field.id, { required: e.target.checked })} />
            Required
          </label>
        </div>

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
    type: "embedded", // embedded, popup, hosted
  });
  const [settings, setSettings] = useState<any>({
    webhookUrl: "",
    targetLists: [],
    recaptcha: { enabled: false },
    successMessage: "Thank you for subscribing!"
  });

  const [activeTab, setActiveTab] = useState<"fields" | "design" | "settings">("fields");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiLang, setApiLang] = useState<string>("cURL");
  const [apiCodeCopied, setApiCodeCopied] = useState(false);

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
          ...(json.data.design || {})
        });
        setSettings({
          webhookUrl: "",
          targetLists: [],
          recaptcha: { enabled: false },
          successMessage: "Thank you for subscribing!",
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

  function addField(type: string, customProps?: { name?: string, label?: string, required?: boolean }) {
    const randomSuffix = Math.random().toString(36).substr(2, 5);
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
    };
    if (['checkbox', 'radio', 'select'].includes(type)) {
      newField.options = ['Option 1', 'Option 2'];
    }
    setSchema([...schema, newField]);
  }

  function updateField(id: string, updates: any) {
    setSchema(schema.map(f => f.id === id ? { ...f, ...updates } : f));
  }

  function removeField(id: string) {
    setSchema(schema.filter(f => f.id !== id));
  }

  const iframeEmbedCode = `<iframe src="${FRONTEND}/f/${id}" width="100%" height="400" frameborder="0" style="border:0; border-radius: 8px; overflow:hidden;" allowtransparency="true"></iframe>`;

  const generateApiPayload = () => {
    const payload: any = {};
    schema.forEach(f => {
      payload[f.name] = f.type === 'email' ? 'user@example.com' : 'value';
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
          <a href={`/f/${id}?preview=true`} target="_blank" className="btn-secondary flex items-center gap-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm font-medium">
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
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    Special Fields
                  </h4>
                  <div className="flex flex-col gap-2 mb-6">
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => addField("text", { name: "fullName", label: "Full Name", required: true })}>
                      <Plus size={14} /> Full Name
                    </button>
                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => addField("text", { name: "firstName", label: "First Name", required: true })}>
                        <Plus size={14} /> First Name
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => addField("text", { name: "lastName", label: "Last Name", required: false })}>
                        <Plus size={14} /> Last Name
                      </button>
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => addField("email", { name: "email", label: "Email Address", required: true })}>
                      <Plus size={14} /> Email Address
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => addField("tel", { name: "phone", label: "Phone Number", required: false })}>
                      <Plus size={14} /> Phone Number
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Standard Fields</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => addField("text")}>
                      <Plus size={14} /> Short Answer
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => addField("textarea")}>
                      <Plus size={14} /> Paragraph
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => addField("radio")}>
                      <Plus size={14} /> Multiple Choice
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => addField("checkbox")}>
                      <Plus size={14} /> Checkboxes
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => addField("select")}>
                      <Plus size={14} /> Dropdown
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => addField("date")}>
                      <Plus size={14} /> Date
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => addField("time")}>
                      <Plus size={14} /> Time
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => addField("range")}>
                      <Plus size={14} /> Linear Scale
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'design' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700">Button Text</label>
                  <input type="text" className="input" value={design.buttonText || ""} onChange={e => setDesign({...design, buttonText: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700">Button Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" className="w-8 h-8 rounded border border-gray-300 cursor-pointer" value={design.buttonColor || "#4f46e5"} onChange={e => setDesign({...design, buttonColor: e.target.value})} />
                      <input type="text" className="input text-sm font-mono uppercase" value={design.buttonColor || ""} onChange={e => setDesign({...design, buttonColor: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700">Button Text Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" className="w-8 h-8 rounded border border-gray-300 cursor-pointer" value={design.buttonTextColor || "#ffffff"} onChange={e => setDesign({...design, buttonTextColor: e.target.value})} />
                      <input type="text" className="input text-sm font-mono uppercase" value={design.buttonTextColor || ""} onChange={e => setDesign({...design, buttonTextColor: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <input 
                type="text" 
                className="w-full text-4xl font-bold text-gray-900 border-none bg-transparent focus:ring-0 p-0 mb-4 focus:outline-none placeholder-gray-300"
                placeholder="Form Title"
                value={design.title || ""} 
                onChange={e => setDesign({...design, title: e.target.value})} 
              />
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
                  <input type="text" readOnly className="input font-mono text-sm bg-gray-50" value={`${FRONTEND}/f/${id}`} />
                  <button className="btn-secondary whitespace-nowrap" onClick={() => {navigator.clipboard.writeText(`${FRONTEND}/f/${id}`); alert("Copied!");}}>Copy Link</button>
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
