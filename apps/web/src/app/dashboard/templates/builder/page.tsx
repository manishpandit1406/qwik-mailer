"use client";
import { useState, useEffect, Suspense } from "react";
import {
  X,
  ArrowLeft,
  RefreshCw,
  Zap,
  AlertTriangle,
  Wand2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
function getToken() {
  return typeof window !== "undefined"
    ? (localStorage.getItem("mf_access_token") ?? "")
    : "";
}
function extractVars(html: string) {
  const regex = /\{\{([\s\S]+?)\}\}/g;
  const vars = new Set<string>();
  let match;
  while ((match = regex.exec(html)) !== null) {
    const inner = match[1].trim();
    if (inner.startsWith("if")) {
      const cond = inner.substring(3).trim();
      const m = cond.match(/^(\w+)/);
      if (m) vars.add(m[1]);
    } else if (inner.startsWith("elseif")) {
      const cond = inner.substring(7).trim();
      const m = cond.match(/^(\w+)/);
      if (m) vars.add(m[1]);
    } else if (
      inner === "else" ||
      inner === "endif" ||
      inner === "unsubscribe_url"
    ) {
    } else {
      if (inner.includes("|")) {
        vars.add(inner.split("|")[0].trim());
      } else {
        vars.add(inner);
      }
    }
  }
  return Array.from(vars);
}
function TemplateBuilderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const [loading, setLoading] = useState(!!editId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [tab, setTab] = useState<"code" | "preview">("code");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("professional");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{
    subject: string;
    html: string;
  } | null>(null);
  const [aiError, setAiError] = useState("");
  useEffect(() => {
    if (editId) {
      fetchTemplate(editId);
    } else {
      const draft = localStorage.getItem("mf_template_draft");
      if (draft) {
        try {
          const { name, subject, htmlBody } = JSON.parse(draft);
          if (name) setName(name);
          if (subject) setSubject(subject);
          if (htmlBody) setHtmlBody(htmlBody);
        } catch (e) {}
      }
    }
  }, [editId]);
  useEffect(() => {
    if (!editId && (name || subject || htmlBody)) {
      const timer = setTimeout(() => {
        localStorage.setItem(
          "mf_template_draft",
          JSON.stringify({ name, subject, htmlBody }),
        );
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [name, subject, htmlBody, editId]);
  async function fetchTemplate(id: string) {
    try {
      const res = await fetch(`${API}/v1/templates/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setName(json.data.name);
        setSubject(json.data.subject);
        setHtmlBody(json.data.htmlBody);
      }
    } catch {
      setError("Failed to load template.");
    } finally {
      setLoading(false);
    }
  }
  const vars = extractVars(htmlBody + "" + subject);
  async function handleSave() {
    if (!name || !subject || !htmlBody) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `${API}/v1/templates${editId ? `/${editId}` : ""}`,
        {
          method: editId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ name, subject, htmlBody, variables: vars }),
        },
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Failed to save template.");
        return;
      }
      if (!editId) {
        localStorage.removeItem("mf_template_draft");
      }
      router.push("/dashboard/templates");
    } catch (e: any) {
      setError("Network error:" + e.message);
    } finally {
      setSaving(false);
    }
  }
  async function handleGenerateAI() {
    if (!aiPrompt) return;
    setAiGenerating(true);
    setAiError("");
    setAiResult(null);
    try {
      const res = await fetch(`${API}/v1/ai/generate-template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          tone: aiTone,
          variables: vars,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        const errMsg =
          json.error ||
          json.message ||
          json.issues?.[0]?.message ||
          "Failed to generate template";
        setAiError(errMsg);
      } else {
        setAiResult(json.data);
      }
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiGenerating(false);
    }
  }
  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        {" "}
        <RefreshCw className="animate-spin text-gray-400" />{" "}
      </div>
    );
  }
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -m-6 animate-fade-in bg-white relative overflow-hidden">
      {" "}
      <div
        className="p-4 bg-white border-b flex items-center justify-between z-20 shadow-sm"
        style={{ borderColor: "var(--border)" }}
      >
        {" "}
        <div className="flex items-center gap-4">
          {" "}
          <Link
            href="/dashboard/templates"
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            {" "}
            <ArrowLeft size={18} />{" "}
          </Link>{" "}
          <h3
            className="font-bold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            {" "}
            {editId ? "Edit Template" : "New Template"}{" "}
          </h3>{" "}
        </div>{" "}
        <div className="flex items-center gap-3">
          {" "}
          {error && (
            <span className="text-sm text-red-600 flex items-center gap-1">
              {" "}
              <AlertTriangle size={13} /> {error}{" "}
            </span>
          )}{" "}
          <button
            className="btn-primary flex items-center gap-2 px-6"
            onClick={handleSave}
            disabled={saving || !name || !subject || !htmlBody}
          >
            {" "}
            {saving ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Zap size={14} />
            )}{" "}
            {saving ? "Saving..." : "Save Template"}{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      <div
        className="p-4 grid grid-cols-2 gap-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {" "}
        <input
          className="input"
          placeholder="Template name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />{" "}
        <input
          className="input"
          placeholder="Subject line (use {{variables}})"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />{" "}
      </div>{" "}
      {vars.length > 0 && (
        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex flex-wrap items-center gap-1.5">
          {" "}
          <span className="text-xs text-indigo-600 font-medium">
            Detected variables:
          </span>{" "}
          {vars.map((v) => (
            <span
              key={v}
              className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-mono"
            >
              {" "}
              {"{{"} {v} {"}}"}{" "}
            </span>
          ))}{" "}
        </div>
      )}{" "}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        {" "}
        {(["code", "preview"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2.5 text-xs font-semibold capitalize transition-all border-b-2"
            style={{
              borderColor: tab === t ? "var(--accent)" : "transparent",
              color: tab === t ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {" "}
            {t === "code" ? "✏️ HTML Editor" : "👁️ Live Preview"}{" "}
          </button>
        ))}{" "}
        <div className="ml-auto pr-4 flex items-center" />{" "}
      </div>{" "}
      <div className="flex-1 overflow-hidden">
        {" "}
        {tab === "code" ? (
          <textarea
            className="w-full h-full font-mono text-xs resize-none border-none outline-none p-4"
            style={{
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              minHeight: "300px",
            }}
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            placeholder="<h1>Hello {{name}}!</h1>"
            spellCheck={false}
          />
        ) : (
          <iframe
            srcDoc={
              htmlBody ||
              "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-family:sans-serif;'>Preview will appear here</div>"
            }
            className="w-full h-full border-none bg-white"
            style={{ minHeight: "300px" }}
            title="Template preview"
          />
        )}{" "}
      </div>{" "}
      <button
        onClick={() => setAiOpen(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 shadow-md hover:shadow-lg text-gray-700 hover:text-indigo-600 hover:border-indigo-300 transition-all z-30 text-sm font-medium"
        title="AI Assistant"
      >
        {" "}
        <Wand2 size={15} /> Write with AI{" "}
      </button>{" "}
      {aiOpen && (
        <div className="absolute inset-y-0 right-0 w-96 bg-white shadow-md z-40 flex flex-col border-l border-gray-200">
          {" "}
          <div className="p-4 border-b flex items-center justify-between">
            {" "}
            <div className="flex items-center gap-2 font-semibold text-gray-800">
              {" "}
              <Wand2 size={16} className="text-indigo-500" /> Write with AI{" "}
            </div>{" "}
            <button
              onClick={() => setAiOpen(false)}
              className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-500 transition-colors"
            >
              {" "}
              <X size={16} />{" "}
            </button>{" "}
          </div>{" "}
          <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
            {" "}
            <div>
              {" "}
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                {" "}
                What kind of email do you want?{" "}
              </label>{" "}
              <textarea
                className="input min-h-[100px] resize-none"
                placeholder="e.g. A welcome email for new signups with a discount offer..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                Tone
              </label>{" "}
              <select
                className="input"
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value)}
              >
                {" "}
                <option value="professional">Professional</option>{" "}
                <option value="friendly">Friendly</option>{" "}
                <option value="formal">Formal</option>{" "}
                <option value="casual">Casual</option>{" "}
              </select>{" "}
            </div>{" "}
            <button
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
              onClick={handleGenerateAI}
              disabled={aiGenerating || !aiPrompt}
            >
              {" "}
              {aiGenerating ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <Wand2 size={16} />
              )}{" "}
              {aiGenerating ? "Generating..." : "✨ Generate Magic"}{" "}
            </button>{" "}
            {aiError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 flex items-start gap-2">
                {" "}
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />{" "}
                <p>{aiError}</p>{" "}
              </div>
            )}{" "}
            {aiResult && (
              <div className="p-4 border rounded-xl bg-gray-50 flex flex-col gap-3">
                {" "}
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {" "}
                  Generated Result ✅{" "}
                </div>{" "}
                <div>
                  {" "}
                  <div className="text-[10px] text-gray-500 font-medium mb-0.5">
                    Subject Line
                  </div>{" "}
                  <div className="text-sm font-medium text-gray-900 bg-white border rounded-lg p-2">
                    {" "}
                    {aiResult.subject}{" "}
                  </div>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <div className="text-[10px] text-gray-500 font-medium mb-0.5">
                    Body Preview
                  </div>{" "}
                  <div className="text-xs text-gray-600 bg-white p-2 border rounded-lg line-clamp-4">
                    {" "}
                    {aiResult.html
                      .replace(/<[^>]*>?/gm, "")
                      .replace(/\s+/g, "")
                      .trim()
                      .slice(0, 150)}
                    ...{" "}
                  </div>{" "}
                </div>{" "}
                <button
                  className="btn-primary mt-1 flex items-center justify-center gap-2 py-2.5"
                  onClick={() => {
                    setSubject(aiResult.subject);
                    setHtmlBody(aiResult.html);
                    setAiOpen(false);
                  }}
                >
                  {" "}
                  <Zap size={14} /> Insert into Editor{" "}
                </button>{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
export default function TemplateBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 flex justify-center">
          {" "}
          <RefreshCw className="animate-spin text-gray-400" />{" "}
        </div>
      }
    >
      {" "}
      <TemplateBuilderInner />{" "}
    </Suspense>
  );
}
