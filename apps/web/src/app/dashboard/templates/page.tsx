"use client";
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
} from "lucide-react";
import Link from "next/link";
import { ConfirmModal } from "@/components/ConfirmModal";
import { LogoLoader } from "@/components/LogoLoader";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
interface Template {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  variables: string[];
  createdAt: string;
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
    <div className="space-y-5 animate-fade-in">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2
            className="text-xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Email Templates
          </h2>{" "}
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {" "}
            Reusable templates with variables like{" "}
            <code className="code-block py-0.5 px-1.5 text-xs">
              {"{{name}}"}
            </code>
            , fallbacks{" "}
            <code className="code-block py-0.5 px-1.5 text-xs">
              {'{{name | "Friend"}}'}
            </code>
            , and conditionals{" "}
            <code className="code-block py-0.5 px-1.5 text-xs">
              {"{{if score > 90}}...{{endif}}"}
            </code>{" "}
          </p>{" "}
        </div>{" "}
        <div className="flex gap-2">
          {" "}
          <button className="btn-ghost p-2" onClick={fetchTemplates}>
            {" "}
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />{" "}
          </button>{" "}
          <Link
            href="/dashboard/templates/builder"
            className="btn-primary flex items-center gap-2"
          >
            {" "}
            <Plus size={14} /> New Template{" "}
          </Link>{" "}
        </div>{" "}
      </div>{" "}
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
      {loading ? (
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
          <Link
            href="/dashboard/templates/builder"
            className="btn-primary flex items-center gap-2 mx-auto inline-flex"
          >
            {" "}
            <Plus size={14} /> Create Template{" "}
          </Link>{" "}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 stagger-children">
          {" "}
          {templates.map((t) => (
            <div key={t.id} className="glass-card p-5 animate-fade-up group relative overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-500/10 hover:border-gray-300 transition-all duration-300 bg-white flex flex-col h-full">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="flex items-start justify-between mb-4 relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-gray-50 to-white border border-gray-200 text-gray-700 shadow-sm">
                  <FileText size={18} strokeWidth={2.5} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {" "}
                  <button
                    className="btn-ghost p-1.5"
                    onClick={() => setShowCode(t)}
                    title="Integration Code"
                  >
                    {" "}
                    <Code size={13} />{" "}
                  </button>{" "}
                  <button
                    className="text-gray-400 hover:text-gray-800 transition-colors p-1"
                    onClick={() => setPreviewTemplate(t)}
                  >
                    {" "}
                    <Eye size={14} />{" "}
                  </button>{" "}
                  <Link
                    href={`/dashboard/templates/builder?id=${t.id}`}
                    className="text-gray-400 hover:text-gray-800 transition-colors p-1"
                  >
                    {" "}
                    <Edit2 size={14} />{" "}
                  </Link>{" "}
                  <button
                    onClick={() => requestDelete(t.id)}
                    className="btn-ghost p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 :bg-red-500/10"
                    title="Delete"
                  >
                    {" "}
                    <Trash2 size={14} />{" "}
                  </button>{" "}
                </div>{" "}
              </div>{" "}
              <h3 className="font-bold text-gray-900 mb-1 line-clamp-1 relative">
                {t.name}
              </h3>{" "}
              <p
                className="text-xs mb-3 truncate"
                style={{ color: "var(--text-muted)" }}
              >
                {t.subject}
              </p>{" "}
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
                  onClick={() => handleCopy(t.id)}
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
                  Added {new Date(t.createdAt).toLocaleDateString()}
                </p>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}{" "}
        </div>
      )}{" "}
      {/* Preview modal */}{" "}
      {previewTemplate && (
        <div
          className="fixed inset-0 lg:left-60 z-50 flex items-center justify-center p-6 bg-gray-900/40"
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
            currentSnippet = `async function sendTemplateEmail() {\n const url = '${API}/v1/send';\n const apiKey = 'YOUR_API_KEY';\n\n const response = await fetch(url, {\n method: 'POST',\n headers: {\n 'Content-Type': 'application/json',\n 'X-API-Key': apiKey\n },\n body: JSON.stringify({\n to:"customer@example.com",\n templateId:"${showCode.id}",\n variables: {\n${showCode.variables.map((v) => `"${v}":"Value for ${v}"`).join(",\n")}\n }\n })\n });\n\n const data = await response.json();\n console.log(data);\n}\n\nsendTemplateEmail();`;
          } else if (codeTab === "python") {
            currentSnippet = `import requests\n\nurl ="${API}/v1/send"\nheaders = {\n"Content-Type":"application/json",\n"X-API-Key":"YOUR_API_KEY"\n}\ndata = {\n"to":"customer@example.com",\n"templateId":"${showCode.id}",\n"variables": {\n${showCode.variables.map((v) => `"${v}":"Value for ${v}"`).join(",\n")}\n }\n}\n\nresponse = requests.post(url, json=data, headers=headers)\nprint(response.json())`;
          } else if (codeTab === "php") {
            currentSnippet = `<?php\n$url ="${API}/v1/send";\n\n$data = [\n"to" =>"customer@example.com",\n"templateId" =>"${showCode.id}",\n"variables" => [\n${showCode.variables.map((v) => `"${v}" =>"Value for ${v}"`).join(",\n")}\n ]\n];\n\n$ch = curl_init($url);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n"Content-Type: application/json",\n"X-API-Key: YOUR_API_KEY"\n]);\n\n$response = curl_exec($ch);\ncurl_close($ch);\necho $response;\n?>`;
          } else if (codeTab === "curl") {
            currentSnippet = `curl -X POST ${API}/v1/send \\\n -H"X-API-Key: YOUR_API_KEY" \\\n -H"Content-Type: application/json" \\\n -d '{\n"to":"customer@example.com",\n"templateId":"${showCode.id}",\n"variables": {\n${showCode.variables.map((v) => `"${v}":"Value for ${v}"`).join(",\n")}\n }\n }'`;
          } else if (codeTab === "go") {
            currentSnippet = `package main\n\nimport (\n\t"bytes"\n\t"encoding/json"\n\t"fmt"\n\t"net/http"\n)\n\nfunc main() {\n\turl :="${API}/v1/send"\n\tpayload := map[string]interface{}{\n\t\t"to":"customer@example.com",\n\t\t"templateId":"${showCode.id}",\n\t\t"variables": map[string]string{\n${showCode.variables.map((v) => `\t\t\t"${v}":"Value for ${v}",`).join("\n")}\n\t\t},\n\t}\n\n\tjsonData, _ := json.Marshal(payload)\n\treq, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))\n\treq.Header.Set("Content-Type","application/json")\n\treq.Header.Set("X-API-Key","YOUR_API_KEY")\n\n\tclient := &http.Client{}\n\tresp, _ := client.Do(req)\n\tdefer resp.Body.Close()\n\n\tfmt.Println("Status:", resp.Status)\n}`;
          } else if (codeTab === "ruby") {
            currentSnippet = `require 'uri'\nrequire 'net/http'\nrequire 'json'\n\nurl = URI("${API}/v1/send")\nhttp = Net::HTTP.new(url.host, url.port)\n# http.use_ssl = true if url.scheme == 'https'\n\nrequest = Net::HTTP::Post.new(url)\nrequest["Content-Type"] ="application/json"\nrequest["X-API-Key"] ="YOUR_API_KEY"\nrequest.body = {\n to:"customer@example.com",\n templateId:"${showCode.id}",\n variables: {\n${showCode.variables.map((v) => `"${v}" =>"Value for ${v}"`).join(",\n")}\n }\n}.to_json\n\nresponse = http.request(request)\nputs response.read_body`;
          } else if (codeTab === "java") {
            currentSnippet = `import java.net.URI;\nimport java.net.http.HttpClient;\nimport java.net.http.HttpRequest;\nimport java.net.http.HttpResponse;\n\npublic class Main {\n public static void main(String[] args) throws Exception {\n String jsonBody ="{" +\n"\\"to\\": \\"customer@example.com\\"," +\n"\\"templateId\\": \\"${showCode.id}\\"," +\n"\\"variables\\": {" +\n${showCode.variables.map((v) => `"\\"${v}\\": \\"Value for ${v}\\""`).join(' + "," +\n')}\n"}" +\n"}";\n\n HttpRequest request = HttpRequest.newBuilder()\n .uri(URI.create("${API}/v1/send"))\n .header("Content-Type","application/json")\n .header("X-API-Key","YOUR_API_KEY")\n .POST(HttpRequest.BodyPublishers.ofString(jsonBody))\n .build();\n\n HttpClient client = HttpClient.newHttpClient();\n HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());\n System.out.println(response.body());\n }\n}`;
          }
          return (
            <div
              className="fixed inset-0 lg:left-60 z-50 flex items-center justify-center p-6 bg-gray-900/50"
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
