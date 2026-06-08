"use client";
import { formatIST } from "@/lib/dateUtils";
import { useState, useEffect } from "react";
import { Plus, Key, Trash2, Copy, CheckCircle2, RefreshCw, BookOpen, Shield } from "lucide-react";
import Link from "next/link";
import { LogoLoader } from "@/components/LogoLoader";
import { useRole } from "@/lib/useRole";
const CODE_LANGS = ["cURL", "Node.js", "Python", "PHP", "Java", "Go"] as const;
type Lang = (typeof CODE_LANGS)[number];
const CODE_EXAMPLES: Record<Lang, string> = {
  cURL: `curl -X POST https://api.qwikmailer.in/v1/send \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "hello@example.com",
    "fromName": "My App",
    "to": "user@example.com",
    "subject": "Hello!",
    "html": "<h1>Hi there!</h1><p>Welcome aboard.</p>"
  }'`,
  "Node.js": `const response = await fetch('https://api.qwikmailer.in/v1/send', {
  method: 'POST',
  headers: {
    'X-API-Key': 'YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'hello@example.com',
    fromName: 'My App',
    to: 'user@example.com',
    subject: 'Hello!',
    html: '<h1>Hi there!</h1><p>Welcome aboard.</p>',
  }),
});

const data = await response.json();
console.log(data);`,
  Python: `import requests

response = requests.post(
    'https://api.qwikmailer.in/v1/send',
    headers={
        'X-API-Key': 'YOUR_API_KEY',
        'Content-Type': 'application/json',
    },
    json={
        'from': 'hello@example.com',
        'fromName': 'My App',
        'to': 'user@example.com',
        'subject': 'Hello!',
        'html': '<h1>Hi there!</h1><p>Welcome aboard.</p>',
    }
)

print(response.json())`,
  PHP: `<?php

$ch = curl_init('https://api.qwikmailer.in/v1/send');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: YOUR_API_KEY',
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'from' => 'hello@example.com',
    'fromName' => 'My App',
    'to' => 'user@example.com',
    'subject' => 'Hello!',
    'html' => '<h1>Hi there!</h1><p>Welcome aboard.</p>',
]));

$response = curl_exec($ch);
curl_close($ch);

echo $response;`,
  Java: `import java.net.http.*;
import java.net.URI;

HttpClient client = HttpClient.newHttpClient();

String body = """
    {
      "from": "hello@example.com",
      "fromName": "My App",
      "to": "user@example.com",
      "subject": "Hello!",
      "html": "<h1>Hi!</h1>"
    }""";

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.qwikmailer.in/v1/send"))
    .header("X-API-Key", "YOUR_API_KEY")
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(body))
    .build();

HttpResponse<String> response = client
    .send(request, HttpResponse.BodyHandlers.ofString());

System.out.println(response.body());`,
  Go: `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

func main() {
	payload, _ := json.Marshal(map[string]string{
		"from":     "hello@example.com",
		"fromName": "My App",
		"to":       "user@example.com",
		"subject":  "Hello!",
		"html":     "<h1>Hi there!</h1>",
	})

	req, _ := http.NewRequest("POST", "https://api.qwikmailer.in/v1/send", bytes.NewBuffer(payload))
	req.Header.Set("X-API-Key", "YOUR_API_KEY")
	req.Header.Set("Content-Type", "application/json")

	resp, _ := http.DefaultClient.Do(req)
	defer resp.Body.Close()

	fmt.Println("Status:", resp.Status)
}`
};
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  isActive: boolean;
}
function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("mf_access_token") ?? "")
    : "";
}

function QuickStart() {
  const [activeGuide, setActiveGuide] = useState<"api" | "smtp">("api");
  const [lang, setLang] = useState<Lang>("cURL");
  const [codeCopied, setCodeCopied] = useState(false);
  const [projectId, setProjectId] = useState<string>("Loading...");

  useEffect(() => {
    async function fetchSlug() {
      const activeTeamId = localStorage.getItem("mf_active_team");
      if (!activeTeamId) return;
      try {
        const res = await fetch(`${API}/v1/teams`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const json = await res.json();
        if (json.success) {
          const allTeams = [
            ...(json.data.owned || []),
            ...(json.data.member || []),
          ];
          const current = allTeams.find((t: any) => t.id === activeTeamId);
          if (current) {
            setProjectId(current.slug);
          }
        }
      } catch {}
    }
    fetchSlug();
  }, []);
  
  const [copiedHost, setCopiedHost] = useState(false);
  const [copiedPort, setCopiedPort] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);

  function copyText(text: string, setter: React.Dispatch<React.SetStateAction<boolean>>) {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  }

  function copyCode() {
    navigator.clipboard.writeText(CODE_EXAMPLES[lang]);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }
  
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex border-b border-gray-100 bg-gray-50/50">
        <button 
          onClick={() => setActiveGuide("api")} 
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeGuide === "api" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500 hover:bg-gray-50"}`}
        >
          REST API
        </button>
        <button 
          onClick={() => setActiveGuide("smtp")} 
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeGuide === "smtp" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500 hover:bg-gray-50"}`}
        >
          SMTP Relay
        </button>
      </div>

      {activeGuide === "api" ? (
        <>
          <div className="px-5 pt-4 pb-0 flex items-center justify-between">
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Quick Start
            </p>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              {codeCopied ? (
                <CheckCircle2 size={12} className="text-emerald-500" />
              ) : (
                <Copy size={12} />
              )}
              {codeCopied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="flex border-b border-gray-100 mt-3 px-5 gap-0 overflow-x-auto">
            {CODE_LANGS.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all border-b-2"
                style={{
                  borderBottomColor: lang === l ? "var(--accent)" : "transparent",
                  color: lang === l ? "var(--accent)" : "var(--text-muted)",
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
            {CODE_EXAMPLES[lang]}
          </pre>
        </>
      ) : (
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Send emails from your existing application or email client using our SMTP Relay. Use any standard library like NodeMailer, WP Mail SMTP, or PHPMailer.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">SMTP Host</p>
                <p className="font-mono text-sm font-medium text-gray-900">smtp.qwikmailer.in</p>
              </div>
              <button onClick={() => copyText("smtp.qwikmailer.in", setCopiedHost)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                {copiedHost ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Port</p>
                <p className="font-mono text-sm font-medium text-gray-900">2525</p>
              </div>
              <button onClick={() => copyText("2525", setCopiedPort)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                {copiedPort ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Username <span className="normal-case text-gray-400 font-normal ml-1">(Project Slug)</span></p>
                <p className="font-mono text-sm font-medium text-gray-900">{projectId}</p>
              </div>
              <button onClick={() => copyText(projectId, setCopiedUser)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                {copiedUser ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Password</p>
                <p className="font-mono text-sm font-medium text-gray-900">mf_live_... <span className="text-gray-400 font-sans text-xs font-normal ml-1">(Your API Key)</span></p>
              </div>
              <button disabled title="Copy your actual API Key from the table below" className="p-2 text-gray-300 cursor-not-allowed">
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const { isViewer, canAdmin } = useRole();
  async function fetchKeys() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/api-keys`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json();
      if (json.success) setKeys(json.data);
    } catch {
      setError("Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchKeys();
  }, []);
  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${API}/v1/api-keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newKeyName }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Failed to create key.");
        return;
      }
      setNewKeyValue(json.data.key);
      await fetchKeys();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }
  async function revokeKey(id: string) {
    if (
      !confirm(
        "Are you sure you want to revoke this API key? This cannot be undone.",
      )
    )
      return;
    try {
      const res = await fetch(`${API}/v1/api-keys/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setKeys(keys.map((k) => (k.id === id ? { ...k, isActive: false } : k)));
      } else {
        setError(json.error ?? "Failed to revoke key.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
  }
  function copyKey(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  function closeCreate() {
    setShowCreate(false);
    setNewKeyValue(null);
    setNewKeyName("");
  }
  return (
    <div className="max-w-5xl mx-auto w-full space-y-5 pb-10">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2
            className="text-xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            API Keys
          </h2>{" "}
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Manage keys for authenticating API requests.
          </p>{" "}
        </div>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <button className="btn-ghost p-2" title="Refresh" onClick={fetchKeys}>
            {" "}
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />{" "}
          </button>{" "}
          <Link
            href="/dashboard/security-logs"
            className="btn-secondary flex items-center gap-2"
          >
            <Shield size={14} /> API Logs
          </Link>
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2"
          >
            <BookOpen size={14} /> API Docs
          </a>
          {!isViewer && (
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => setShowCreate(true)}
            >
              {" "}
              <Plus size={14} /> Create Key{" "}
            </button>
          )}{" "}
        </div>{" "}
      </div>{" "}
      {/* Error banner */}{" "}
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
      {/* Usage guide */} <QuickStart /> {/* Keys list */}{" "}
      <div className="glass-card overflow-hidden">
        {" "}
        {loading ? (
          <LogoLoader fullPage text="Loading your API keys..." />
        ) : keys.length === 0 ? (
          <div className="p-12 text-center">
            {" "}
            <Key size={32} className="mx-auto mb-3 text-gray-300" />{" "}
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              No API keys yet
            </p>{" "}
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Create your first key to start sending emails via API.
            </p>{" "}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key Prefix</th>
                <th>Status</th>
                <th>Last Used</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id}>
                  <td
                    className="font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <Key size={13} className="text-indigo-600" />{" "}
                      {key.name}{" "}
                    </div>{" "}
                  </td>
                  <td>
                    {" "}
                    <code className="code-block py-1 px-2 text-xs">
                      {key.prefix}••••••••
                    </code>{" "}
                  </td>
                  <td>
                    {" "}
                    {key.isActive ? (
                      <span className="badge-success flex items-center gap-1 w-fit">
                        {" "}
                        <div className="status-dot active" /> Active{" "}
                      </span>
                    ) : (
                      <span className="badge-muted">Revoked</span>
                    )}{" "}
                  </td>
                  <td className="text-xs">
                    {key.lastUsedAt
                      ? formatIST(key.lastUsedAt, false)
                      : "Never"}
                  </td>
                  <td className="text-xs">
                    {formatIST(key.createdAt, false)}
                  </td>
                  <td>
                    {" "}
                    {key.isActive && !isViewer && (
                      <button
                        className="btn-danger flex items-center gap-1 text-xs py-1.5 px-3"
                        onClick={() => revokeKey(key.id)}
                      >
                        {" "}
                        <Trash2 size={12} /> Revoke{" "}
                      </button>
                    )}{" "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}{" "}
      </div>{" "}
      {/* Create key modal */}{" "}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
          onClick={closeCreate}
        >
          {" "}
          <div
            className="glass-card p-6 max-w-md w-full animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            {" "}
            {!newKeyValue ? (
              <>
                {" "}
                <h3
                  className="font-bold text-lg mb-4"
                  style={{ color: "var(--text-primary)" }}
                >
                  Create API Key
                </h3>{" "}
                {error && <p className="text-sm text-red-600 mb-3">{error}</p>}{" "}
                <input
                  className="input mb-4"
                  placeholder="Key name (e.g., Production App)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createKey()}
                />{" "}
                <div className="flex gap-3">
                  {" "}
                  <button
                    className="btn-secondary flex-1"
                    onClick={closeCreate}
                  >
                    Cancel
                  </button>{" "}
                  <button
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                    onClick={createKey}
                    disabled={creating || !newKeyName.trim()}
                  >
                    {" "}
                    {creating ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : null}{" "}
                    {creating ? "Creating..." : "Create Key"}{" "}
                  </button>{" "}
                </div>{" "}
              </>
            ) : (
              <>
                {" "}
                <div className="flex items-center gap-2 mb-4">
                  {" "}
                  <CheckCircle2 size={20} className="text-emerald-500" />{" "}
                  <h3
                    className="font-bold text-lg"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Key Created!
                  </h3>{" "}
                </div>{" "}
                <div className="p-3 rounded-xl mb-4 bg-emerald-50 border border-emerald-100">
                  {" "}
                  <p className="text-xs mb-2 text-emerald-700">
                    ⚠️ Copy this key now — it will not be shown again.
                  </p>{" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    <code className="flex-1 text-xs font-mono break-all text-indigo-700">
                      {newKeyValue}
                    </code>{" "}
                    <button
                      className="btn-secondary p-2 shrink-0"
                      onClick={() => copyKey(newKeyValue!)}
                    >
                      {" "}
                      {copied ? (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      ) : (
                        <Copy size={14} />
                      )}{" "}
                    </button>{" "}
                  </div>{" "}
                </div>{" "}
                <button className="btn-primary w-full" onClick={closeCreate}>
                  Done
                </button>{" "}
              </>
            )}{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
