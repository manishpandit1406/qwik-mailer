"use client";
import { formatIST } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import {
  Plus,
  FileText,
  Trash2,
  Eye,
  RefreshCw,
  Edit2,
  X,
  Check,
  Sparkles,
  Copy,
  Code,
  MoreVertical,
  LayoutTemplate,
} from "lucide-react";
import Link from "next/link";
import { ConfirmModal } from "@/components/ConfirmModal";
import { LogoLoader } from "@/components/LogoLoader";
import { PREBUILT_TEMPLATES, TemplateCategory } from "@/lib/prebuilt-templates";
import { useRole } from "@/lib/useRole";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
interface Template {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  variables?: string[];
  createdAt?: string;
}
function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("mf_access_token") ?? "")
    : "";
}
export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCode, setShowCode] = useState<Template | null>(null);
  const [codeTab, setCodeTab] = useState<
    "curl" | "node" | "python" | "php" | "go" | "ruby" | "java"
  >("node");
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"my-templates" | "gallery">("my-templates");
  const [selectedCategory, setSelectedCategory] = useState<"All" | TemplateCategory>("All");
  const { isViewer } = useRole();
  useEffect(() => {
    fetchTemplates();
  }, []);
  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/templates`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json();
      if (json.success) setTemplates(json.data.items || json.data);
    } catch {
      setError("Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }
  function requestDelete(id: string) {
    setTemplateToDelete(id);
    setDeleteModalOpen(true);
  }
  async function handleDelete() {
    if (!templateToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/v1/templates/${templateToDelete}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete));
        setDeleteModalOpen(false);
        setTemplateToDelete(null);
      } else {
        setError("Failed to delete template.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setDeleting(false);
    }
  }
  const handleCopySnippet = (code: string) => {
    navigator.clipboard.writeText(code);
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 2000);
  };
  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  return (
    <div className="space-y-5 ">
      {" "}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none opacity-60"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none opacity-60"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-indigo-100/50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100/50 shadow-sm">
              <LayoutTemplate size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1.5 tracking-tight">
                Email Templates
              </h2>
              <p className="text-sm text-gray-500 max-w-lg leading-relaxed">
                Design reusable templates with variables like <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-700 font-mono">{'{{name}}'}</code>, fallbacks like <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-700 font-mono">{'{{name | "Friend"}}'}</code>, and dynamic conditionals.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button className="btn-secondary flex items-center gap-2 bg-white shadow-sm hover:shadow-md transition-shadow py-2.5" onClick={fetchTemplates}>
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {!isViewer && (
              <Link
                href="/dashboard/templates/builder"
                className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all py-2.5 px-5"
              >
                <Plus size={16} strokeWidth={2.5} /> New Template
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Sleek Segmented Tabs */}
      <div className="flex items-center bg-gray-100/80 p-1 rounded-xl w-max mb-8 border border-gray-200/60 shadow-inner">
        <button
          onClick={() => setActiveTab("my-templates")}
          className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
            activeTab === "my-templates"
              ? "bg-white text-indigo-700 shadow-sm border border-gray-200/50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
          }`}
        >
          <FileText size={16} strokeWidth={activeTab === "my-templates" ? 2.5 : 2} /> My Templates
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
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          {" "}
          {error}{" "}
          <button
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-600 ml-2"
          >
            ✕
          </button>{" "}
        </div>
      )}{" "}
      
      {activeTab === "gallery" ? (
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {["All", "Welcome", "E-commerce", "Marketing", "Transactional"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat ? "bg-indigo-600 text-white shadow-md" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 stagger-children">
            {PREBUILT_TEMPLATES.filter(t => selectedCategory === "All" || t.category === selectedCategory).map((t) => (
              <div key={t.id} className="glass-card animate-fade-up group relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-500/10 hover:border-indigo-200 transition-all duration-300 bg-white flex flex-col h-full cursor-pointer" onClick={() => setPreviewTemplate({ id: t.id, name: t.name, subject: t.subject, htmlBody: t.htmlBody })}>
                {/* Thumbnail Preview area */}
                <div className="h-48 w-full bg-white relative overflow-hidden border-b border-gray-100 pointer-events-none flex justify-center">
                  <div style={{ width: '600px', height: '800px', transform: 'scale(0.5)', transformOrigin: 'top center' }}>
                    <iframe srcDoc={t.htmlBody} className="w-full h-full border-0 pointer-events-none bg-white" tabIndex={-1} scrolling="no" />
                  </div>
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-indigo-900/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                    <div className="bg-white/90 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all border border-indigo-100">
                      <Eye size={14} /> Quick Look
                    </div>
                  </div>
                </div>
                
                {/* Content area */}
                <div className="p-4 flex flex-col flex-1 relative z-10">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {t.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1 relative z-10 text-sm">
                    {t.name}
                  </h3>
                  <p className="text-xs mb-3 text-gray-500 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>
                  <div className="mt-auto pt-3 relative z-10 border-t border-gray-50">
                    {!isViewer && (
                      <Link
                        href={`/dashboard/templates/builder?preset=${t.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full btn-secondary py-2 text-xs flex justify-center items-center gap-2 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
                      >
                        <Plus size={14} strokeWidth={2.5} /> Use Template
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : loading ? (
        <div className="glass-card overflow-hidden">
          <LogoLoader fullPage text="Loading templates..." />
        </div>
      ) : templates.length === 0 ? (
        <div className="glass-card p-12 text-center">
          {" "}
          <FileText size={32} className="mx-auto mb-3 text-gray-300" />{" "}
          <p
            className="font-semibold text-sm mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            No templates found
          </p>{" "}
          <p className="text-xs text-gray-400 mb-5">
            Create a reusable HTML template with variables to speed up your
            campaigns.
          </p>{" "}
          {!isViewer && (
            <Link
              href="/dashboard/templates/builder"
              className="btn-primary flex items-center gap-2 mx-auto inline-flex"
            >
              {" "}
              <Plus size={14} /> Create Template{" "}
            </Link>
          )}{" "}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 stagger-children">
          {" "}
          {templates.map((t) => (
              <div key={t.id} className="glass-card animate-fade-up group relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-500/10 hover:border-gray-300 transition-all duration-300 bg-white flex flex-col h-full cursor-pointer" onClick={() => setPreviewTemplate(t)}>
                {/* Thumbnail Preview area */}
                <div className="h-48 w-full bg-white relative overflow-hidden border-b border-gray-100 pointer-events-none flex justify-center">
                  <div style={{ width: '600px', height: '800px', transform: 'scale(0.5)', transformOrigin: 'top center' }}>
                    <iframe srcDoc={t.htmlBody} className="w-full h-full border-0 pointer-events-none bg-white" tabIndex={-1} scrolling="no" />
                  </div>
                  {/* Hover Overlay with Action Buttons */}
                  <div className="absolute inset-0 bg-gray-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-[2px] gap-3 pointer-events-auto">
                    <div className="flex gap-2">
                      <button
                        className="bg-white/90 text-gray-700 hover:text-indigo-600 p-2 rounded-full shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all hover:bg-white"
                        onClick={(e) => { e.stopPropagation(); setShowCode(t); }}
                        title="Integration Code"
                      >
                        <Code size={16} />
                      </button>
                      {!isViewer && (
                        <>
                          <Link
                            href={`/dashboard/templates/builder?id=${t.id}`}
                            className="bg-white/90 text-gray-700 hover:text-indigo-600 p-2 rounded-full shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all delay-75 hover:bg-white"
                            onClick={(e) => e.stopPropagation()}
                            title="Edit Template"
                          >
                            <Edit2 size={16} />
                          </Link>
                          <button
                            className="bg-white/90 text-gray-700 hover:text-red-600 p-2 rounded-full shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all delay-150 hover:bg-white"
                            onClick={(e) => { e.stopPropagation(); requestDelete(t.id); }}
                            title="Delete Template"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1 relative z-10">
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1 relative text-sm">
                    {t.name}
                  </h3>
                  <p className="text-xs mb-3 truncate text-gray-500">
                    {t.subject}
                  </p>
                  
                  <div className="flex items-center justify-between mb-4 bg-gray-50/50 p-2 rounded-lg border border-gray-100 group-hover:bg-gray-100/50 group-hover:border-gray-200 transition-colors">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-700 uppercase tracking-wider shrink-0 transition-colors">
                        ID
                      </span>
                      <span className="text-[11px] font-mono text-gray-600 group-hover:text-gray-900 truncate" title="Template ID">
                        {t.id}
                      </span>
                    </div>
                    <button
                      className="p-1.5 hover:bg-white rounded-md text-gray-400 group-hover:text-gray-800 transition-all shrink-0 hover:shadow-sm"
                      onClick={(e) => { e.stopPropagation(); handleCopy(t.id); }}
                      title="Copy Template ID"
                    >
                      {copiedId === t.id ? (
                        <Check size={14} className="text-green-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>

                  <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between relative">
                    <p className="text-[11px] font-medium text-gray-400">
                      Added {formatIST(t.createdAt!, false)}
                    </p>
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
          ))}{" "}
        </div>
      )}{" "}
      {/* Preview modal */}{" "}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
          onClick={() => setPreviewTemplate(null)}
        >
          {" "}
          <div
            className="glass-card p-6 max-w-2xl w-full animate-fade-up max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {" "}
            <div className="flex items-center justify-between mb-4">
              {" "}
              <h3
                className="font-bold text-lg"
                style={{ color: "var(--text-primary)" }}
              >
                {previewTemplate.name}
              </h3>{" "}
              <button
                className="btn-ghost p-1"
                onClick={() => setPreviewTemplate(null)}
              >
                ✕
              </button>{" "}
            </div>{" "}
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              Subject: {previewTemplate.subject}
            </p>
            {previewTemplate.variables && previewTemplate.variables.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Available Variables:</p>
                <div className="flex flex-wrap gap-1">
                  {previewTemplate.variables.map((v) => (
                    <span key={v} className="badge-info text-xs">
                      {"{{" + v + "}}"}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-xl overflow-hidden border border-gray-200">
              {" "}
              <iframe
                srcDoc={previewTemplate.htmlBody}
                className="w-full h-72 bg-white"
                title="Template preview"
              />{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Code Snippets Modal */}{" "}
      {showCode &&
        (() => {
          let currentSnippet = "";
          if (codeTab === "node") {
            currentSnippet = `async function sendTemplateEmail() {\n const url = '${API}/v1/send';\n const apiKey = 'YOUR_API_KEY';\n\n const response = await fetch(url, {\n method: 'POST',\n headers: {\n 'Content-Type': 'application/json',\n 'X-API-Key': apiKey\n },\n body: JSON.stringify({\n to:"customer@example.com",\n templateId:"${showCode.id}",\n variables: {\n${(showCode.variables || []).map((v: string) => `"${v}":"Value for ${v}"`).join(",\n")}\n }\n })\n });\n\n const data = await response.json();\n console.log(data);\n}\n\nsendTemplateEmail();`;
          } else if (codeTab === "python") {
            currentSnippet = `import requests\n\nurl ="${API}/v1/send"\nheaders = {\n"Content-Type":"application/json",\n"X-API-Key":"YOUR_API_KEY"\n}\ndata = {\n"to":"customer@example.com",\n"templateId":"${showCode.id}",\n"variables": {\n${(showCode.variables || []).map((v: string) => `"${v}":"Value for ${v}"`).join(",\n")}\n }\n}\n\nresponse = requests.post(url, json=data, headers=headers)\nprint(response.json())`;
          } else if (codeTab === "php") {
            currentSnippet = `<?php\n$url ="${API}/v1/send";\n\n$data = [\n"to" =>"customer@example.com",\n"templateId" =>"${showCode.id}",\n"variables" => [\n${(showCode.variables || []).map((v: string) => `"${v}" =>"Value for ${v}"`).join(",\n")}\n ]\n];\n\n$ch = curl_init($url);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n"Content-Type: application/json",\n"X-API-Key: YOUR_API_KEY"\n]);\n\n$response = curl_exec($ch);\ncurl_close($ch);\necho $response;\n?>`;
          } else if (codeTab === "curl") {
            currentSnippet = `curl -X POST ${API}/v1/send \\\n -H"X-API-Key: YOUR_API_KEY" \\\n -H"Content-Type: application/json" \\\n -d '{\n"to":"customer@example.com",\n"templateId":"${showCode.id}",\n"variables": {\n${(showCode.variables || []).map((v: string) => `"${v}":"Value for ${v}"`).join(",\n")}\n }\n }'`;
          } else if (codeTab === "go") {
            currentSnippet = `package main\n\nimport (\n\t"bytes"\n\t"encoding/json"\n\t"fmt"\n\t"net/http"\n)\n\nfunc main() {\n\turl :="${API}/v1/send"\n\tpayload := map[string]interface{}{\n\t\t"to":"customer@example.com",\n\t\t"templateId":"${showCode.id}",\n\t\t"variables": map[string]string{\n${(showCode.variables || []).map((v: string) => `\t\t\t"${v}":"Value for ${v}",`).join("\n")}\n\t\t},\n\t}\n\n\tjsonData, _ := json.Marshal(payload)\n\treq, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))\n\treq.Header.Set("Content-Type","application/json")\n\treq.Header.Set("X-API-Key","YOUR_API_KEY")\n\n\tclient := &http.Client{}\n\tresp, _ := client.Do(req)\n\tdefer resp.Body.Close()\n\n\tfmt.Println("Status:", resp.Status)\n}`;
          } else if (codeTab === "ruby") {
            currentSnippet = `require 'uri'\nrequire 'net/http'\nrequire 'json'\n\nurl = URI("${API}/v1/send")\nhttp = Net::HTTP.new(url.host, url.port)\n# http.use_ssl = true if url.scheme == 'https'\n\nrequest = Net::HTTP::Post.new(url)\nrequest["Content-Type"] ="application/json"\nrequest["X-API-Key"] ="YOUR_API_KEY"\nrequest.body = {\n to:"customer@example.com",\n templateId:"${showCode.id}",\n variables: {\n${(showCode.variables || []).map((v: string) => `"${v}" =>"Value for ${v}"`).join(",\n")}\n }\n}.to_json\n\nresponse = http.request(request)\nputs response.read_body`;
          } else if (codeTab === "java") {
            currentSnippet = `import java.net.URI;\nimport java.net.http.HttpClient;\nimport java.net.http.HttpRequest;\nimport java.net.http.HttpResponse;\n\npublic class Main {\n public static void main(String[] args) throws Exception {\n String jsonBody ="{" +\n"\\"to\\": \\"customer@example.com\\"," +\n"\\"templateId\\": \\"${showCode.id}\\"," +\n"\\"variables\\": {" +\n${(showCode.variables || []).map((v: string) => `"\\"${v}\\": \\"Value for ${v}\\""`).join(' + "," +\n')}\n"}" +\n"}";\n\n HttpRequest request = HttpRequest.newBuilder()\n .uri(URI.create("${API}/v1/send"))\n .header("Content-Type","application/json")\n .header("X-API-Key","YOUR_API_KEY")\n .POST(HttpRequest.BodyPublishers.ofString(jsonBody))\n .build();\n\n HttpClient client = HttpClient.newHttpClient();\n HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());\n System.out.println(response.body());\n }\n}`;
          }
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowCode(null)}
            >
              {" "}
              <div
                className="glass-card p-0 max-w-4xl w-full animate-fade-up overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {" "}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  {" "}
                  <h3
                    className="font-bold text-base flex items-center gap-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {" "}
                    <Code size={16} /> API Integration Code{" "}
                  </h3>{" "}
                  <button
                    className="btn-ghost p-1"
                    onClick={() => setShowCode(null)}
                  >
                    ✕
                  </button>{" "}
                </div>{" "}
                <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 bg-gray-50/50">
                  {" "}
                  {(
                    [
                      "node",
                      "python",
                      "php",
                      "curl",
                      "go",
                      "ruby",
                      "java",
                    ] as const
                  ).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCodeTab(lang)}
                      className={`text-sm font-medium capitalize transition-colors ${codeTab === lang ? "text-indigo-600 underline underline-offset-4" : "text-gray-500 hover:text-gray-800"}`}
                    >
                      {" "}
                      {lang === "node" ? "Node.js" : lang}{" "}
                    </button>
                  ))}{" "}
                </div>{" "}
                <div className="relative">
                  {" "}
                  <button
                    className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/80 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-700 transition-colors shadow-sm"
                    onClick={() => handleCopySnippet(currentSnippet)}
                  >
                    {" "}
                    {snippetCopied ? (
                      <Check size={14} className="text-green-600" />
                    ) : (
                      <Copy size={14} />
                    )}{" "}
                    {snippetCopied ? "Copied!" : "Copy Code"}{" "}
                  </button>{" "}
                  <div
                    className="bg-[#fafafa] p-6 overflow-x-auto text-sm text-gray-800 font-mono border-b border-gray-200"
                    style={{ maxHeight: "55vh" }}
                  >
                    {" "}
                    <pre>
                      <code>{currentSnippet}</code>
                    </pre>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="p-4 bg-white border-t border-gray-200 text-xs text-gray-500">
                  {" "}
                  💡 Replace{" "}
                  <strong className="text-gray-800">YOUR_API_KEY</strong> with a
                  real API key from the API Keys page, and fill in actual
                  variable values.{" "}
                </div>{" "}
              </div>{" "}
            </div>
          );
        })()}{" "}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Template"
        message="Are you sure you want to delete this template? This action cannot be undone and any workflows using this template may fail."
        confirmText="Delete Template"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
        isLoading={deleting}
      />{" "}
    </div>
  );
}
